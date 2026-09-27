"use strict";


/* ============================================================
   CONSTANTS
   ============================================================ */

const ALARM_NAME =
  "respondio-background-refresh";


const MIN_BACKGROUND_SECONDS =
  30;


const DEFAULTS = {

  enabled: false,

  interval: 10,

  idleDelay: 5,

  returnGrace: 5,

  x: null,

  y: null

};


/* ============================================================
   GET SETTINGS
   ============================================================ */

async function getSettings() {

  return await chrome.storage.local.get(
    DEFAULTS
  );

}


/* ============================================================
   INSTALL
   ============================================================ */

chrome.runtime.onInstalled.addListener(
  async () => {

    const current =
      await chrome.storage.local.get(
        DEFAULTS
      );


    await chrome.storage.local.set({
      ...DEFAULTS,
      ...current
    });


    await configureAlarm();

  }
);


/* ============================================================
   STARTUP
   ============================================================ */

chrome.runtime.onStartup.addListener(
  async () => {

    await configureAlarm();

  }
);


/* ============================================================
   FIND RESPOND.IO TABS
   ============================================================ */

async function getRespondTabs() {

  return await chrome.tabs.query({
    url:
      "https://app.respond.io/*"
  });

}


/* ============================================================
   BACKGROUND CLICK
   ============================================================ */

async function backgroundClick(
  tabId
) {

  const settings =
    await getSettings();


  if (!settings.enabled) {

    return;

  }


  if (
    settings.x === null ||
    settings.y === null
  ) {

    return;

  }


  try {

    await chrome.tabs.sendMessage(
      tabId,
      {
        type:
          "BACKGROUND_REFRESH"
      }
    );

  } catch (error) {

    /*
     * Content script may not be ready.
     *
     * Try injecting it.
     */

    try {

      await chrome.scripting.executeScript({
        target: {
          tabId
        },

        files: [
          "content.js"
        ]
      });


      await chrome.tabs.sendMessage(
        tabId,
        {
          type:
            "BACKGROUND_REFRESH"
        }
      );

    } catch (_) {

      /*
       * Ignore this cycle.
       */

    }

  }

}


/* ============================================================
   CLICK ALL RESPOND.IO TABS
   ============================================================ */

async function clickAllRespondTabs() {

  const tabs =
    await getRespondTabs();


  for (
    const tab of tabs
  ) {

    if (!tab.id) {
      continue;
    }


    await backgroundClick(
      tab.id
    );

  }

}


/* ============================================================
   CONFIGURE ALARM
   ============================================================ */

async function configureAlarm() {

  await chrome.alarms.clear(
    ALARM_NAME
  );


  const settings =
    await getSettings();


  if (!settings.enabled) {

    return;

  }


  let interval =
    Number(
      settings.interval
    );


  if (
    !Number.isFinite(interval)
  ) {

    interval =
      MIN_BACKGROUND_SECONDS;

  }


  /*
   * Background Chrome alarms are limited.
   */

  interval =
    Math.max(
      MIN_BACKGROUND_SECONDS,
      interval
    );


  await chrome.alarms.create(
    ALARM_NAME,
    {
      delayInMinutes:
        interval / 60,

      periodInMinutes:
        interval / 60,

      persistAcrossSessions:
        true
    }
  );

}


/* ============================================================
   ALARM EVENT
   ============================================================ */

chrome.alarms.onAlarm.addListener(
  async alarm => {

    if (
      alarm.name !==
      ALARM_NAME
    ) {

      return;

    }


    const settings =
      await getSettings();


    if (!settings.enabled) {

      return;

    }


    await clickAllRespondTabs();

  }
);


/* ============================================================
   SETTINGS CHANGED
   ============================================================ */

chrome.storage.onChanged.addListener(
  async (
    changes,
    area
  ) => {

    if (
      area !==
      "local"
    ) {

      return;

    }


    if (
      changes.enabled ||
      changes.interval
    ) {

      await configureAlarm();

    }

  }
);


/* ============================================================
   ENABLE / DISABLE
   ============================================================ */

async function setEnabled(
  enabled
) {

  await chrome.storage.local.set({
    enabled
  });


  /*
   * Immediate attempt.
   *
   * This means you don't have to wait
   * for the first timer.
   */

  if (enabled) {

    await clickAllRespondTabs();

  }


  await configureAlarm();


  /*
   * Tell visible Respond.io tabs about
   * the state change.
   */

  const tabs =
    await getRespondTabs();


  for (
    const tab of tabs
  ) {

    if (!tab.id) {
      continue;
    }


    try {

      await chrome.tabs.sendMessage(
        tab.id,
        {
          type:
            "ENABLED_CHANGED",

          enabled
        }
      );

    } catch (_) {}

  }

}


/* ============================================================
   POPUP MESSAGES
   ============================================================ */

chrome.runtime.onMessage.addListener(
  (
    message,
    sender,
    sendResponse
  ) => {

    if (!message) {
      return;
    }


    if (
      message.type ===
      "TOGGLE_ENABLED"
    ) {

      setEnabled(
        Boolean(
          message.enabled
        )
      )
        .then(() => {

          sendResponse({
            ok: true
          });

        });


      return true;

    }


    if (
      message.type ===
      "FORCE_REFRESH"
    ) {

      clickAllRespondTabs()
        .then(() => {

          sendResponse({
            ok: true
          });

        });


      return true;

    }

  }
);


/* ============================================================
   KEYBOARD SHORTCUT
   ============================================================ */

chrome.commands.onCommand.addListener(
  async command => {

    if (
      command !==
      "toggle-refresher"
    ) {

      return;

    }


    const settings =
      await getSettings();


    await setEnabled(
      !settings.enabled
    );

  }
);

