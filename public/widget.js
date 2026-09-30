/*
 * Testolife chat widget — add ONE line to any page of the hospital's website:
 *   <script src="https://YOUR-TESTOLIFE-DOMAIN/widget.js" async></script>
 * It adds a floating chat button; the chat itself runs in an iframe from the Testolife site
 * (/chat?embed=1), so the website never handles patient data.
 */
(function () {
  if (window.__testolifeWidget) return;
  window.__testolifeWidget = true;
  var script = document.currentScript;
  var origin = script ? new URL(script.src).origin : window.location.origin;
  var color = (script && script.getAttribute("data-color")) || "#0F766E";

  var button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", "Chat with Testo Life Assistant");
  button.innerHTML =
    '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  button.style.cssText =
    "position:fixed;right:20px;bottom:20px;z-index:2147483000;width:60px;height:60px;border-radius:50%;border:0;" +
    "background:" + color + ";box-shadow:0 8px 24px rgba(15,23,42,.25);cursor:pointer;display:flex;align-items:center;justify-content:center";

  var panel = document.createElement("div");
  panel.style.cssText =
    "position:fixed;right:20px;bottom:92px;z-index:2147483000;width:min(400px,calc(100vw - 24px));height:min(640px,calc(100vh - 120px));" +
    "border-radius:16px;overflow:hidden;box-shadow:0 16px 48px rgba(15,23,42,.3);display:none;background:#fff";
  var frame = document.createElement("iframe");
  frame.title = "Testo Life Assistant";
  frame.style.cssText = "width:100%;height:100%;border:0";
  frame.setAttribute("allow", "clipboard-write");
  panel.appendChild(frame);

  button.addEventListener("click", function () {
    var open = panel.style.display === "none";
    if (open && !frame.src) frame.src = origin + "/chat?embed=1";
    panel.style.display = open ? "block" : "none";
  });

  function mount() {
    document.body.appendChild(panel);
    document.body.appendChild(button);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
