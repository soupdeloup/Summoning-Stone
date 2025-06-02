class NotificationManager {
  constructor() {
    this.notifications = {};
    this.hasUserInteracted = false;
    this.pendingVibrations = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.config = {
      defaultTimerDuration: 30,
      maxNotifications: 20
    };
    this.activeNotificationIntervals = {};
    this.init();
  }

  async init() {
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const configData = await response.json();
        this.config = { ...this.config, ...configData };
      }
    } catch (err) {
      console.warn('Using default config:', err);
    }

    this.setupEventSource();
    this.setupUIHandlers();
    this.testVibrationSupport();
    this.checkUserInteraction();
  }

  checkUserInteraction() {
    if (!this.hasUserInteracted && 'vibrate' in navigator) {
      this.showInteractionPrompt();
    }
  }

  showInteractionPrompt() {
    let prompt = document.getElementById('interaction-prompt');
    if (!prompt) {
      prompt = document.createElement('div');
      prompt.id = 'interaction-prompt';
      prompt.className = 'interaction-prompt';
      prompt.innerHTML = `
        <div class="prompt-content">
          <h2>Tap to enable vibration/audio notifications</h2>
          <button id="enable-interaction" class="enable-btn">Enable Alerts</button>
        </div>
      `;
      document.body.appendChild(prompt);
    }
    
    prompt.style.display = 'flex';
    
    const enableBtn = document.getElementById('enable-interaction');
    const handleInteraction = () => {
      this.handleUserInteraction();
    };
    
    enableBtn.addEventListener('click', handleInteraction, { once: true });
  }

  handleUserInteraction() {
    if (this.hasUserInteracted) return;
    this.hasUserInteracted = true;
    console.log('User interaction detected, enabling audio/vibration features.');

    this.pendingVibrations.forEach(pending => {
      if (pending.type === 'startRepeatingEffects') {
        if (this.notifications[pending.uniqueId] && !this.notifications[pending.uniqueId].expired) {
            this.startOrContinueNotificationEffects(
                pending.notification, 
                pending.uniqueId, 
                this.notifications[pending.uniqueId].remaining,
                pending.isInitialBlast
            );
        }
      }
    });
    this.pendingVibrations = [];

    const prompt = document.getElementById('interaction-prompt');
    if (prompt) prompt.style.display = 'none';
  }
  
  setupEventSource() {
    try {
      this.evtSource = new EventSource('/events');
      this.evtSource.onopen = () => {
        console.log('EventSource connected');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 2000;
        const errorEl = document.querySelector('.connection-error');
        if (errorEl) errorEl.remove();
      };
      this.evtSource.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data);
          this.handleNotification(notification);
        } catch (e) {
          console.error('Error processing message:', e);
        }
      };
      this.evtSource.onerror = (error) => {
        console.error('EventSource error:', error);
        if (this.evtSource.readyState === EventSource.CLOSED) {
          this.handleReconnect();
        }
      };
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      this.handleReconnect();
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.showConnectionError();
      return;
    }
    this.reconnectAttempts++;
    console.log(`Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    setTimeout(() => {
      if (this.evtSource) this.evtSource.close();
      this.setupEventSource();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  showConnectionError() {
    const container = document.getElementById('notifications');
    if (container.querySelector('.connection-error')) return;
    const errorEl = document.createElement('div');
    errorEl.className = 'connection-error';
    errorEl.innerHTML = `
      <p>Connection to server lost. Attempting to reconnect...</p>
      <p><small>If the problem persists, you may need to refresh.</small></p>
      <button onclick="window.location.reload()">Refresh Page</button>
    `;
    container.insertBefore(errorEl, container.firstChild);
  }

  testVibrationSupport() {
    if ('vibrate' in navigator) {
      console.log('Vibration API supported');
    } else {
      console.log('Vibration API not supported, vibration alerts disabled.');
    }
  }

  setupUIHandlers() {
    const interactionEvents = ['click', 'touchstart', 'keydown'];
    interactionEvents.forEach(event => {
      document.addEventListener(event, () => this.handleUserInteraction(), { once: true, passive: true });
    });

    const stopBtn = document.getElementById('stop-vibration');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stopAllRepeatingEffects());
    }
    
    document.addEventListener('touchstart', (e) => {
      const targetNotif = e.target.closest('.notification');
      if (targetNotif) targetNotif.style.transform = 'scale(0.98)';
    }, {passive: true});
    document.addEventListener('touchend', (e) => {
      const targetNotif = e.target.closest('.notification');
      if (targetNotif) targetNotif.style.transform = '';
    }, {passive: true});
  }

  handleNotification(notification) {
    const uniqueId = notification.timestamp;
    const now = Date.now();
    let remainingTime = this.config.defaultTimerDuration;

    if (notification.expiresAt) {
      remainingTime = Math.max(0, Math.floor((notification.expiresAt - now) / 1000));
    } else if (notification.timestamp) {
      const elapsed = Math.floor((now - notification.timestamp) / 1000);
      remainingTime = Math.max(0, this.config.defaultTimerDuration - elapsed);
    }
    notification.expired = remainingTime === 0;

    const noNotifPlaceholder = document.querySelector('.no-notifications');
    if (noNotifPlaceholder) noNotifPlaceholder.style.display = 'none';

    let notifEl = document.querySelector(`.notification[data-notification-id="${uniqueId}"]`);
    if (!notifEl) {
        notifEl = this.createNotificationElement(notification, remainingTime);
        this.addNotificationToDOM(notifEl, notification.expired);
    } else {
         if (notification.expired) notifEl.classList.add('expired'); else notifEl.classList.remove('expired');
    }

    if (!this.notifications[uniqueId] || !this.notifications[uniqueId].interval) {
        this.startTimer(notifEl, uniqueId, remainingTime, notification);
    }
    
    if (!notification.expired) {
        const isFreshForInitialEffects = remainingTime > (this.config.defaultTimerDuration - 5) && !this.activeNotificationIntervals[uniqueId];

        if (!this.activeNotificationIntervals[uniqueId]) {
             this.startOrContinueNotificationEffects(notification, uniqueId, remainingTime, isFreshForInitialEffects);
        }
    } else {
        this.stopRepeatingEffectsForId(uniqueId);
    }
  }
  
  startOrContinueNotificationEffects(notification, uniqueId, remainingTime, isInitialBlast) {
    if (this.activeNotificationIntervals[uniqueId] || remainingTime <= 0) {
      return;
    }

    if (!this.hasUserInteracted && ('vibrate' in navigator || document.getElementById('notification-sound'))) {
      console.log('Queuing notification effects until user interaction for:', uniqueId);
      this.pendingVibrations.push({ 
          type: 'startRepeatingEffects', 
          notification: notification, 
          uniqueId: uniqueId,
          isInitialBlast: isInitialBlast 
      });
      this.showInteractionPrompt();
      return;
    }

    const audio = document.getElementById('notification-sound');

    if (isInitialBlast) {
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Audio play failed (initial):', e.message));
      }
      if ('vibrate' in navigator && this.hasUserInteracted) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    }
    
    this.showVibrationControls();

    this.activeNotificationIntervals[uniqueId] = setInterval(() => {
      const currentNotifState = this.notifications[uniqueId];
      if (!currentNotifState || currentNotifState.expired || currentNotifState.remaining <= 0) {
        this.stopRepeatingEffectsForId(uniqueId);
        return;
      }

      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Audio play failed (interval):', e.message));
      }
      if ('vibrate' in navigator && this.hasUserInteracted) {
        navigator.vibrate([150, 50, 150]);
      }
    }, 2000);
  }

  stopRepeatingEffectsForId(uniqueId) {
    if (this.activeNotificationIntervals[uniqueId]) {
      clearInterval(this.activeNotificationIntervals[uniqueId]);
      delete this.activeNotificationIntervals[uniqueId];
      console.log(`Stopped repeating effects for notification ${uniqueId}`);
    }
    if (Object.keys(this.activeNotificationIntervals).length === 0) {
      this.hideVibrationControls();
    }
  }

  stopAllRepeatingEffects() {
    console.log('User initiated stop for ALL notifications.');
    Object.keys(this.activeNotificationIntervals).forEach(uniqueId => {
      this.stopRepeatingEffectsForId(uniqueId);
    });

    if ('vibrate' in navigator && this.hasUserInteracted) {
      try {
        navigator.vibrate(0);
      } catch (e) {
        console.error('Stop vibration hardware error:', e);
      }
    }
    this.hideVibrationControls();
  }
  
  showVibrationControls() {
    const controls = document.getElementById('vibration-controls');
    if (controls) {
        controls.style.display = 'block';
        void controls.offsetWidth; 
        controls.classList.add('show');
    }
  }

  hideVibrationControls() {
    const controls = document.getElementById('vibration-controls');
    if (controls) {
        controls.classList.remove('show');
        setTimeout(() => {
            if (Object.keys(this.activeNotificationIntervals).length === 0 && !controls.classList.contains('show')) {
                 controls.style.display = 'none';
            }
        }, 300);
    }
  }

  createNotificationElement(notification, remainingTime) {
    const notifEl = document.createElement('div');
    notifEl.className = `notification ${notification.colour}`;
    notifEl.dataset.notificationId = notification.timestamp;
    
    if (notification.expired || remainingTime === 0) {
      notifEl.classList.add('expired');
    }

    const highlightColors = {
      red: 'rgba(255, 96, 96, 0.1)',
      green: 'rgba(96, 255, 96, 0.1)',
      blue: 'rgba(96, 96, 255, 0.1)'
    };
    notifEl.style.setProperty('--highlight-color', highlightColors[notification.colour] || 'rgba(255, 255, 255, 0.1)');

    const contentEl = document.createElement('div');
    contentEl.className = 'notification-content';
    const leftEl = document.createElement('div');
    leftEl.className = 'notification-left';
    const iconEl = document.createElement('div');
    iconEl.className = 'notification-icon';
    iconEl.appendChild(this.createClockIcon());
    const displayTime = notification.time !== '1' ? this.formatTimeAMPM(notification.time) : 'New Alert';
    const timeSpan = document.createElement('span');
    timeSpan.textContent = displayTime;
    iconEl.appendChild(timeSpan);
    leftEl.appendChild(iconEl);
    const eventInfoEl = document.createElement('div');
    eventInfoEl.className = 'event-info';
    eventInfoEl.innerHTML = `
      <span class="info-label">Event Time:</span><span class="info-value">${displayTime}</span>
      <span class="info-label">Received:</span><span class="info-value">${this.formatTimestamp(notification.timestamp)}</span>
    `;
    leftEl.appendChild(eventInfoEl);
    contentEl.appendChild(leftEl);
    const timerEl = document.createElement('div');
    timerEl.className = 'notification-timer';
    timerEl.textContent = `${remainingTime}s`;
    contentEl.appendChild(timerEl);
    notifEl.appendChild(contentEl);
    
    if (!notification.expired && remainingTime > (this.config.defaultTimerDuration - 5)) {
      notifEl.classList.add('highlight');
      setTimeout(() => {
        if (notifEl.parentNode) notifEl.classList.remove('highlight');
      }, 1500);
    }
    return notifEl;
  }

  addNotificationToDOM(notifEl, isExpired) {
    const container = document.getElementById('notifications');
    const errorEl = container.querySelector('.connection-error');
    if (errorEl) errorEl.remove();
    
    const existingNotifications = Array.from(container.querySelectorAll('.notification'));
    const newNotifTimestamp = parseInt(notifEl.dataset.notificationId, 10);

    let inserted = false;
    if (isExpired) {
        const firstOlderExpired = existingNotifications.find(
            ex => ex.classList.contains('expired') && parseInt(ex.dataset.notificationId, 10) < newNotifTimestamp
        );
        if (firstOlderExpired) {
            container.insertBefore(notifEl, firstOlderExpired);
            inserted = true;
        } else {
            const allExpired = existingNotifications.filter(ex => ex.classList.contains('expired'));
            if (allExpired.length > 0) {
                 container.insertBefore(notifEl, allExpired[allExpired.length -1].nextSibling);
            } else {
                 container.appendChild(notifEl);
            }
            inserted = true;
        }
    } else {
        const firstOlderActive = existingNotifications.find(
            ex => !ex.classList.contains('expired') && parseInt(ex.dataset.notificationId, 10) < newNotifTimestamp
        );
        if (firstOlderActive) {
            container.insertBefore(notifEl, firstOlderActive);
            inserted = true;
        } else {
            const firstAnyExpired = container.querySelector('.notification.expired');
            if (firstAnyExpired) {
                container.insertBefore(notifEl, firstAnyExpired);
                inserted = true;
            }
        }
    }

    if (!inserted) {
        container.appendChild(notifEl);
    }

    const allNotifsInDOM = container.querySelectorAll('.notification');
    if (allNotifsInDOM.length > this.config.maxNotifications) {
        let oldestNotifToRemove = Array.from(allNotifsInDOM)
            .filter(n => n.classList.contains('expired'))
            .sort((a,b) => parseInt(a.dataset.notificationId, 10) - parseInt(b.dataset.notificationId, 10))[0];

        if (!oldestNotifToRemove) {
            oldestNotifToRemove = Array.from(allNotifsInDOM)
                .sort((a,b) => parseInt(a.dataset.notificationId, 10) - parseInt(b.dataset.notificationId, 10))[0];
        }
        
        if (oldestNotifToRemove && oldestNotifToRemove !== notifEl) {
            const idToRemove = oldestNotifToRemove.dataset.notificationId;
            this.stopRepeatingEffectsForId(idToRemove);
            if (this.notifications[idToRemove] && this.notifications[idToRemove].interval) {
                 clearInterval(this.notifications[idToRemove].interval);
            }
            delete this.notifications[idToRemove];
            oldestNotifToRemove.remove();
        }
    }
    
    if (container.querySelectorAll('.notification').length === 0) {
        const noNotifPlaceholder = document.querySelector('.no-notifications');
        if (noNotifPlaceholder) noNotifPlaceholder.style.display = 'block';
        else {
            const p = document.createElement('div');
            p.className = 'no-notifications';
            p.textContent = 'Waiting for notifications...';
            container.appendChild(p);
        }
    }
  }

  startTimer(el, uniqueId, initialDuration, rawNotification) {
    if (this.notifications[uniqueId] && this.notifications[uniqueId].interval) {
        clearInterval(this.notifications[uniqueId].interval);
    }

    this.notifications[uniqueId] = {
      el,
      initialDuration,
      remaining: initialDuration,
      expired: initialDuration === 0,
      interval: setInterval(() => this.updateTimer(uniqueId), 1000),
      rawNotification: rawNotification
    };
    if (initialDuration === 0) {
        el.classList.add('expired');
        this.stopRepeatingEffectsForId(uniqueId);
    }
  }

  updateTimer(uniqueId) {
    const notif = this.notifications[uniqueId];
    if (!notif || !notif.el.parentNode) {
      if (notif && notif.interval) clearInterval(notif.interval);
      this.stopRepeatingEffectsForId(uniqueId);
      delete this.notifications[uniqueId];
      return;
    }
    
    notif.remaining = Math.max(0, notif.remaining - 1);
    const timerEl = notif.el.querySelector('.notification-timer');
    if (timerEl) timerEl.textContent = `${notif.remaining}s`;
    
    if (notif.remaining === 0 && !notif.expired) {
      notif.expired = true;
      notif.el.classList.add('expired');
      clearInterval(notif.interval);
      this.stopRepeatingEffectsForId(uniqueId);
      
      const container = document.getElementById('notifications');
      const firstActive = container.querySelector('.notification:not(.expired)');
      if (firstActive) {
          container.insertBefore(notif.el, firstActive);
      } else {
          container.appendChild(notif.el);
      }
    }
  }

  formatTimeAMPM(timeStr) {
    if (!timeStr || timeStr === '1') return 'Now';
    if (timeStr.length !== 6) return timeStr;
    try {
      let hours = parseInt(timeStr.slice(0, 2), 10);
      const minutes = timeStr.slice(2, 4);
      const seconds = timeStr.slice(4, 6);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes}:${seconds} ${ampm}`;
    } catch (e) { return timeStr; }
  }

  formatTimestamp(timestamp) {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Unknown';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    } catch (e) { return 'Unknown'; }
  }

  createClockIcon() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z');
    svg.appendChild(path);
    return svg;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.notificationManager = new NotificationManager();
  });
} else {
  window.notificationManager = new NotificationManager();
}