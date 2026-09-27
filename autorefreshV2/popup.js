"use strict";


const DEFAULTS = {

  enabled: false,

  interval: 10,

  idleDelay: 5,

  returnGrace: 5,

  x: null,

  y: null

};


let currentTab =
  null;


/* ============================================================
   HELPERS
   ============================================================ */

function $(id) {

  return document.getElementById(
    id
  );

}


async function getSettings() {

  return await chrome.storage.local.get(
    DEFAULTS
  );

}


async function getCurrentTab() {

  const tabs =
    await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true
    });


  return tabs[0];

}


function isRespondTab(
  tab
) {

  if (
    !tab ||
    !tab.url
  ) {

    return false;

  }


  try {

    const url =
      new URL(
        tab.url
      );


    return (
      url.hostname ===
      "app.respond.io"
    );

  } catch (_) {

    return false;

  }

}


/* ============================================================
   LOAD UI
   ============================================================ */

async function loadUI() {

  const settings =
    await getSettings();


  /*
   * IMPORTANT:
   *
   * This only runs when the popup opens.
   * It does NOT run every second.
   *
   * Therefore your input fields won't
   * suddenly change while you're typing.
   */

  $("enabled").checked =
    Boolean(
      settings.enabled
    );


  $("interval").value =
    settings.interval;


  $("idleDelay").value =
    settings.idleDelay;


  $("returnGrace").value =
    settings.returnGrace;


  $("x").textContent =
    settings.x === null
      ? "—"
      : settings.x;


  $("y").textContent =
    settings.y === null
      ? "—"
      : settings.y;


  currentTab =
    await getCurrentTab();


  updateStatusUI();

}


/* ============================================================
   STATUS UI
   ============================================================ */

function updateStatusUI() {

  if (
    !isRespondTab(
      currentTab
    )
  ) {

    $("notRespond")
      .classList
      .remove(
        "hidden"
      );


    return;

  }


  $("notRespond")
    .classList
    .add(
      "hidden"
    );


  const enabled =
    $("enabled").checked;


  $("indicator").className =
    enabled
      ? "indicator on"
      : "indicator off";


  $("status").textContent =
    enabled
      ? "Running"
      : "Stopped";

}


/* ============================================================
   ENABLE SWITCH
   ============================================================ */

$("enabled").addEventListener(
  "change",
  async event => {

    const enabled =
      event.target.checked;


    await chrome.runtime.sendMessage({

      type:
        "TOGGLE_ENABLED",

      enabled

    });


    updateStatusUI();

  }
);


/* ============================================================
   SAVE SETTINGS
   ============================================================ */

$("save").addEventListener(
  "click",
  async () => {

    let interval =
      Number(
        $("interval").value
      );


    let idleDelay =
      Number(
        $("idleDelay").value
      );


    let returnGrace =
      Number(
        $("returnGrace").value
      );


    /*
     * Validation.
     */

    if (
      !Number.isFinite(interval) ||
      interval < 1
    ) {

      interval =
        10;

    }


    if (
      !Number.isFinite(idleDelay) ||
      idleDelay < 0
    ) {

      idleDelay =
        5;

    }


    if (
      !Number.isFinite(returnGrace) ||
      returnGrace < 0
    ) {

      returnGrace =
        5;

    }


    $("interval").value =
      interval;


    $("idleDelay").value =
      idleDelay;


    $("returnGrace").value =
      returnGrace;


    await chrome.storage.local.set({

      interval,

      idleDelay,

      returnGrace

    });


    $("save").textContent =
      "Saved ✓";


    setTimeout(
      () => {

        $("save").textContent =
          "Save Settings";

      },
      1200
    );

  }
);


/* ============================================================
   PICK COORDINATES
   ============================================================ */

$("pick").addEventListener(
  "click",
  async () => {

    currentTab =
      await getCurrentTab();


    if (
      !isRespondTab(
        currentTab
      ) ||
      !currentTab.id
    ) {

      alert(
        "Open Respond.io first."
      );

      return;

    }


    try {

      await chrome.tabs.sendMessage(
        currentTab.id,
        {
          type:
            "PICK_COORDINATES"
        }
      );


      /*
       * Close popup so the user can click
       * Respond.io normally.
       */

      window.close();

    } catch (error) {

      alert(
        "Please reload the Respond.io page and try again."
      );

    }

  }
);


/* ============================================================
   TEST CLICK
   ============================================================ */

$("test").addEventListener(
  "click",
  async () => {

    currentTab =
      await getCurrentTab();


    if (
      !isRespondTab(
        currentTab
      ) ||
      !currentTab.id
    ) {

      alert(
        "Open Respond.io first."
      );

      return;

    }


    try {

      const result =
        await chrome.tabs.sendMessage(
          currentTab.id,
          {
            type:
              "TEST_CLICK"
          }
        );


      if (
        result &&
        result.ok
      ) {

        $("test").textContent =
          "Clicked ✓";

      } else {

        $("test").textContent =
          "No target";

      }


      setTimeout(
        () => {

          $("test").textContent =
            "Test Click";

        },
        1000
      );

    } catch (_) {

      alert(
        "Please reload Respond.io and try again."
      );

    }

  }
);


/* ============================================================
   INITIALIZE
   ============================================================ */

loadUI();

