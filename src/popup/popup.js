document.addEventListener("DOMContentLoaded", async function () {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    document.body.innerHTML = `
      <div style="
        width: 250px;
        padding: 20px;
        text-align: center;
        font-family: Arial, sans-serif;
      ">
        <div style="font-size: 24px; margin-bottom: 10px;">📷</div>
        <h3 style="margin: 0 0 10px 0; color: #8359d9;">StereoCamera</h3>
        <p style="margin: 0; color: #666; font-size: 14px;" id="status">
          Injecting control panel...
        </p>
      </div>
    `;

    const statusEl = document.getElementById("status");

    chrome.tabs.sendMessage(tab.id, { action: "toggleUI" }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not loaded, inject it
        statusEl.textContent = "Loading StereoCamera script...";
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            files: ["src/content/image-processor.js", "src/content/stereo.js"],
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error(
                "Failed to inject script:",
                chrome.runtime.lastError
              );
              statusEl.textContent = "Error: Failed to load script";
              statusEl.style.color = "#d32f2f";
            } else {
              statusEl.textContent = "Checking resources...";
              // Check if resources loaded successfully
              setTimeout(() => {
                chrome.tabs.sendMessage(
                  tab.id,
                  { action: "ping" },
                  (response) => {
                    if (chrome.runtime.lastError || !response) {
                      statusEl.textContent = "Error: Could not initialize";
                      statusEl.style.color = "#d32f2f";
                    } else if (!response.resourcesLoaded) {
                      document.body.innerHTML = `
                    <div style="
                      width: 250px;
                      padding: 20px;
                      text-align: center;
                      font-family: Arial, sans-serif;
                    ">
                      <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
                      <h3 style="margin: 0 0 10px 0; color: #ff9800;">Resource Warning</h3>
                      <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">
                        StereoCamera UI resources failed to load. This may be due to browser security restrictions.
                      </p>
                      <p style="margin: 0; color: #666; font-size: 12px;">
                        Please try reloading the page or check browser console for errors.
                      </p>
                    </div>
                  `;
                    } else {
                      chrome.tabs.sendMessage(
                        tab.id,
                        { action: "toggleUI" },
                        (response) => {
                          if (chrome.runtime.lastError) {
                            statusEl.textContent =
                              "Error: Could not activate UI";
                            statusEl.style.color = "#d32f2f";
                          } else {
                            statusEl.textContent = "Control panel activated!";
                            statusEl.style.color = "#2e7d32";
                            setTimeout(() => window.close(), 1000);
                          }
                        }
                      );
                    }
                  }
                );
              }, 800);
            }
          }
        );
      } else {
        statusEl.textContent = "Control panel toggled!";
        statusEl.style.color = "#2e7d32";
        setTimeout(() => window.close(), 800);
      }
    });
  } catch (error) {
    console.error("Error:", error);
    document.body.innerHTML = `
      <div style="
        width: 250px;
        padding: 20px;
        font-family: Arial, sans-serif;
        text-align: center;
      ">
        <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
        <h3 style="margin: 0 0 10px 0; color: #d32f2f;">Error</h3>
        <p style="margin: 0; color: #666; font-size: 14px;">
          ${error.message}
        </p>
      </div>
    `;
  }
});
