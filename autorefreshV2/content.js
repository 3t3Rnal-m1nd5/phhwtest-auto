"use strict";


(() => {

  /*
   * Prevent duplicate initialization.
   */

  if (
    window.__RESPONDIO_REFRESHER_V4
  ) {

    return;

  }


  window.__RESPONDIO_REFRESHER_V4 =
    true;


  /* ==========================================================
     DEFAULTS
     ========================================================== */

  const DEFAULTS = {

    enabled: false,

    interval: 10,

    idleDelay: 5,

    returnGrace: 5,

    x: null,

    y: null

  };


  /* ==========================================================
     STATE
     ========================================================== */

  let settings = {
    ...DEFAULTS
  };


  let timer =
    null;


  let lastMouseActivity =
    Date.now();


  let lastKeyboardActivity =
    Date.now();


  let lastRefresh =
    0;


  let becameVisibleAt =
    Date.now();


  let status =
    "Stopped";


  let pickerActive =
    false;


  /* ==========================================================
     LOAD SETTINGS
     ========================================================== */

  async function loadSettings() {

    settings =
      await chrome.storage.local.get(
        DEFAULTS
      );


    restartVisibleTimer();

  }


  loadSettings();


  /* ==========================================================
     SETTINGS CHANGED
     ========================================================== */

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


      await loadSettings();

    }
  );


  /* ==========================================================
     USER ACTIVITY
     ========================================================== */

  document.addEventListener(
    "mousemove",
    () => {

      if (
        !pickerActive
      ) {

        lastMouseActivity =
          Date.now();

      }

    },
    {
      capture: true,
      passive: true
    }
  );


  document.addEventListener(
    "mousedown",
    () => {

      if (
        !pickerActive
      ) {

        lastMouseActivity =
          Date.now();

      }

    },
    {
      capture: true,
      passive: true
    }
  );


  document.addEventListener(
    "wheel",
    () => {

      if (
        !pickerActive
      ) {

        lastMouseActivity =
          Date.now();

      }

    },
    {
      capture: true,
      passive: true
    }
  );


  document.addEventListener(
    "keydown",
    event => {

      if (
        pickerActive
      ) {

        return;

      }


      /*
       * Don't count modifier-only presses
       * as meaningful activity.
       */

      if (
        [
          "Shift",
          "Control",
          "Alt",
          "Meta",
          "CapsLock",
          "NumLock"
        ].includes(
          event.key
        )
      ) {

        return;

      }


      lastKeyboardActivity =
        Date.now();

    },
    {
      capture: true
    }
  );


  /* ==========================================================
     VISIBILITY
     ========================================================== */

  document.addEventListener(
    "visibilitychange",
    () => {

      if (
        document.visibilityState ===
        "visible"
      ) {

        becameVisibleAt =
          Date.now();


        /*
         * Reset activity timers when returning.
         */

        lastMouseActivity =
          Date.now();


        lastKeyboardActivity =
          Date.now();


        status =
          "Returned — waiting";

      }


      restartVisibleTimer();

    }
  );


  /* ==========================================================
     ACTIVE ELEMENT
     ========================================================== */

  function getDeepActiveElement() {

    let element =
      document.activeElement;


    while (
      element &&
      element.shadowRoot &&
      element.shadowRoot.activeElement
    ) {

      element =
        element.shadowRoot.activeElement;

    }


    return element;

  }


  /* ==========================================================
     CHAT INPUT DETECTION
     ========================================================== */

  function isTyping() {

    const element =
      getDeepActiveElement();


    if (!element) {

      return false;

    }


    if (
      element.isContentEditable
    ) {

      return true;

    }


    if (
      element.matches &&
      element.matches(
        "[contenteditable='true']"
      )
    ) {

      return true;

    }


    if (
      element.getAttribute &&
      element.getAttribute(
        "role"
      ) ===
      "textbox"
    ) {

      return true;

    }


    if (
      element.tagName ===
      "TEXTAREA"
    ) {

      return true;

    }


    if (
      element.tagName ===
      "INPUT"
    ) {

      const type =
        (
          element.type ||
          "text"
        ).toLowerCase();


      return ![
        "button",
        "checkbox",
        "radio",
        "submit",
        "reset",
        "file",
        "hidden"
      ].includes(
        type
      );

    }


    /*
     * Check parents.
     */

    let parent =
      element.parentElement;


    for (
      let i = 0;
      i < 5 && parent;
      i++
    ) {

      if (
        parent.isContentEditable
      ) {

        return true;

      }


      if (
        parent.getAttribute &&
        (
          parent.getAttribute(
            "contenteditable"
          ) ===
          "true" ||

          parent.getAttribute(
            "role"
          ) ===
          "textbox"
        )
      ) {

        return true;

      }


      parent =
        parent.parentElement;

    }


    return false;

  }


  /* ==========================================================
     IDLE CHECK
     ========================================================== */

  function userIsIdle() {

    const now =
      Date.now();


    const idleDelay =
      Math.max(
        0,
        Number(
          settings.idleDelay
        ) || 0
      );


    const mouseIdle =
      (
        now -
        lastMouseActivity
      ) / 1000;


    const keyboardIdle =
      (
        now -
        lastKeyboardActivity
      ) / 1000;


    return (
      mouseIdle >= idleDelay &&
      keyboardIdle >= idleDelay
    );

  }


  /* ==========================================================
     RETURN GRACE
     ========================================================== */

  function withinReturnGrace() {

    const grace =
      Math.max(
        0,
        Number(
          settings.returnGrace
        ) || 0
      );


    const elapsed =
      (
        Date.now() -
        becameVisibleAt
      ) / 1000;


    return elapsed < grace;

  }


  /* ==========================================================
     INDICATOR
     ========================================================== */

  function showIndicator(
    x,
    y,
    label = "AUTO CLICK"
  ) {

    /*
     * Remove previous indicator.
     */

    const old =
      document.getElementById(
        "__RESPONDIO_AUTO_CLICK_INDICATOR"
      );


    if (old) {

      old.remove();

    }


    const ripple =
      document.createElement(
        "div"
      );


    ripple.id =
      "__RESPONDIO_AUTO_CLICK_INDICATOR";


    Object.assign(
      ripple.style,
      {

        position:
          "fixed",

        left:
          `${x}px`,

        top:
          `${y}px`,

        width:
          "26px",

        height:
          "26px",

        marginLeft:
          "-13px",

        marginTop:
          "-13px",

        border:
          "3px solid #22c55e",

        background:
          "rgba(34,197,94,.20)",

        borderRadius:
          "50%",

        pointerEvents:
          "none",

        zIndex:
          "2147483647",

        transform:
          "scale(.4)",

        opacity:
          "1",

        transition:
          "transform .5s ease-out, opacity .5s ease-out"

      }
    );


    document.documentElement.appendChild(
      ripple
    );


    const text =
      document.createElement(
        "div"
      );


    Object.assign(
      text.style,
      {

        position:
          "fixed",

        left:
          `${x + 18}px`,

        top:
          `${y - 30}px`,

        padding:
          "4px 7px",

        borderRadius:
          "5px",

        background:
          "#16a34a",

        color:
          "#fff",

        font:
          "700 10px system-ui, sans-serif",

        pointerEvents:
          "none",

        zIndex:
          "2147483647",

        opacity:
          "1",

        transition:
          "opacity .5s ease"

      }
    );


    text.textContent =
      label;


    document.documentElement.appendChild(
      text
    );


    requestAnimationFrame(
      () => {

        ripple.style.transform =
          "scale(1.8)";

        ripple.style.opacity =
          "0";

        text.style.opacity =
          "0";

      }
    );


    setTimeout(
      () => {

        ripple.remove();
        text.remove();

      },
      650
    );

  }


  /* ==========================================================
     SAVE FOCUS
     ========================================================== */

  function saveFocusedElement() {

    const element =
      getDeepActiveElement();


    if (!element) {

      return null;

    }


    return {
      element,

      start:
        typeof element.selectionStart ===
        "number"
          ? element.selectionStart
          : null,

      end:
        typeof element.selectionEnd ===
        "number"
          ? element.selectionEnd
          : null

    };

  }


  /* ==========================================================
     RESTORE FOCUS
     ========================================================== */

  function restoreFocus(
    saved
  ) {

    if (!saved) {

      return;

    }


    setTimeout(
      () => {

        try {

          if (
            !document.contains(
              saved.element
            )
          ) {

            return;

          }


          saved.element.focus({
            preventScroll:
              true
          });


          if (
            saved.start !== null &&
            typeof saved.element
              .setSelectionRange ===
              "function"
          ) {

            saved.element.setSelectionRange(
              saved.start,
              saved.end
            );

          }

        } catch (_) {}

      },
      0
    );

  }


  /* ==========================================================
     ACTUAL COORDINATE CLICK
     ========================================================== */

  function coordinateClick() {

    const x =
      Number(
        settings.x
      );


    const y =
      Number(
        settings.y
      );


    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    ) {

      status =
        "Coordinates not set";

      return false;

    }


    /*
     * Find the element underneath
     * the configured viewport coordinate.
     */

    const element =
      document.elementFromPoint(
        x,
        y
      );


    /*
     * Indicator is shown regardless.
     */

    showIndicator(
      x,
      y
    );


    if (!element) {

      status =
        "Coordinate hit nothing";

      return false;

    }


    /*
     * Don't move the real mouse.
     *
     * We simply trigger the element's
     * click behavior programmatically.
     */

    const clickable =
      element.closest?.(
        "button, a, [role='button'], [onclick]"
      ) ||
      element;


    try {

      clickable.click();


      lastRefresh =
        Date.now();


      status =
        "Clicked ✓";


      return true;

    } catch (error) {

      console.error(
        "Respond.io Refresher click error:",
        error
      );


      status =
        "Click failed";


      return false;

    }

  }


  /* ==========================================================
     AUTOMATIC REFRESH
     ========================================================== */

  function automaticRefresh(
    source
  ) {

    if (
      !settings.enabled
    ) {

      status =
        "Stopped";

      return false;

    }


    /*
     * ========================================================
     * VISIBLE TAB
     * ========================================================
     */

    if (
      document.visibilityState ===
      "visible"
    ) {

      /*
       * Never interrupt typing.
       */

      if (
        isTyping()
      ) {

        status =
          "Paused — typing";


        return false;

      }


      /*
       * Never interrupt active mouse use.
       */

      if (
        !userIsIdle()
      ) {

        status =
          "Paused — user active";


        return false;

      }


      /*
       * Wait after returning to Respond.io.
       */

      if (
        withinReturnGrace()
      ) {

        status =
          "Paused — just returned";


        return false;

      }

    }


    /*
     * Prevent accidental double-clicks.
     */

    const interval =
      Math.max(
        1,
        Number(
          settings.interval
        ) || 10
      );


    const elapsed =
      (
        Date.now() -
        lastRefresh
      ) / 1000;


    if (
      lastRefresh &&
      elapsed <
      Math.max(
        0.5,
        interval * 0.8
      )
    ) {

      return false;

    }


    return coordinateClick();

  }


  /* ==========================================================
     VISIBLE TIMER
     ========================================================== */

  function restartVisibleTimer() {

    if (timer) {

      clearInterval(
        timer
      );

      timer =
        null;

    }


    if (
      !settings.enabled
    ) {

      return;

    }


    /*
     * The fast timer is only useful while
     * Respond.io is visible.
     */

    if (
      document.visibilityState !==
      "visible"
    ) {

      return;

    }


    const seconds =
      Math.max(
        1,
        Number(
          settings.interval
        ) || 10
      );


    timer =
      setInterval(
        () => {

          automaticRefresh(
            "visible-timer"
          );

        },
        seconds * 1000
      );

  }


  /* ==========================================================
     MESSAGE HANDLER
     ========================================================== */

  chrome.runtime.onMessage.addListener(
    (
      message,
      sender,
      sendResponse
    ) => {

      if (!message) {

        return;

      }


      /* ------------------------------------------------------
         BACKGROUND REFRESH
         ------------------------------------------------------ */

      if (
        message.type ===
        "BACKGROUND_REFRESH"
      ) {

        const result =
          automaticRefresh(
            "background"
          );


        sendResponse({
          ok:
            result,

          status,

          timestamp:
            Date.now()
        });


        return true;

      }


      /* ------------------------------------------------------
         ENABLED CHANGED
         ------------------------------------------------------ */

      if (
        message.type ===
        "ENABLED_CHANGED"
      ) {

        settings.enabled =
          Boolean(
            message.enabled
          );


        status =
          settings.enabled
            ? "Running"
            : "Stopped";


        restartVisibleTimer();


        sendResponse({
          ok: true
        });


        return true;

      }


      /* ------------------------------------------------------
         TEST CLICK
         ------------------------------------------------------ */

      if (
        message.type ===
        "TEST_CLICK"
      ) {

        /*
         * Test intentionally ignores
         * typing/idle protection.
         */

        const result =
          coordinateClick();


        sendResponse({
          ok:
            result,

          status
        });


        return true;

      }


      /* ------------------------------------------------------
         PICK COORDINATES
         ------------------------------------------------------ */

      if (
        message.type ===
        "PICK_COORDINATES"
      ) {

        startPicker();


        sendResponse({
          ok: true
        });


        return true;

      }


      /* ------------------------------------------------------
         STATUS
         ------------------------------------------------------ */

      if (
        message.type ===
        "GET_STATUS"
      ) {

        sendResponse({

          ok: true,

          enabled:
            settings.enabled,

          status,

          x:
            settings.x,

          y:
            settings.y,

          typing:
            isTyping(),

          visible:
            document.visibilityState ===
            "visible"

        });


        return true;

      }

    }
  );


  /* ==========================================================
     COORDINATE PICKER
     ========================================================== */

  function startPicker() {

    if (pickerActive) {

      return;

    }


    pickerActive =
      true;


    const originalCursor =
      document.body.style.cursor;


    document.body.style.cursor =
      "crosshair";


    const banner =
      document.createElement(
        "div"
      );


    banner.id =
      "__RESPONDIO_COORDINATE_PICKER";


    Object.assign(
      banner.style,
      {

        position:
          "fixed",

        top:
          "15px",

        left:
          "50%",

        transform:
          "translateX(-50%)",

        padding:
          "12px 18px",

        borderRadius:
          "8px",

        background:
          "#111827",

        color:
          "#fff",

        font:
          "600 13px system-ui, sans-serif",

        zIndex:
          "2147483647",

        boxShadow:
          "0 10px 30px rgba(0,0,0,.3)",

        pointerEvents:
          "none"

      }
    );


    banner.textContent =
      "Click the exact refresh location";


    document.documentElement.appendChild(
      banner
    );


    function pick(event) {

      event.preventDefault();

      event.stopPropagation();

      event.stopImmediatePropagation();


      const x =
        event.clientX;


      const y =
        event.clientY;


      chrome.storage.local.set({

        x,
        y

      });


      settings.x =
        x;

      settings.y =
        y;


      pickerActive =
        false;


      document.body.style.cursor =
        originalCursor;


      banner.remove();


      document.removeEventListener(
        "click",
        pick,
        true
      );


      showIndicator(
        x,
        y,
        "SAVED"
      );


      status =
        `Saved X:${x} Y:${y}`;

    }


    document.addEventListener(
      "click",
      pick,
      true
    );

  }


  /* ==========================================================
     INITIAL STATUS
     ========================================================== */

  status =
    "Ready";


  console.log(
    "[Respond.io Smart Refresher] v4 loaded"
  );


})();

