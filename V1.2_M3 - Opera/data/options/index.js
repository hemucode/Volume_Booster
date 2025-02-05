var audioStates = {}, API = chrome || browser;

const popup = {
  message: (callback) => {
    API.runtime.onMessage.addListener((request, sender, sendResponse) => {
      callback(request, sender, sendResponse);
    });
  }
};

var config = {
  value: (tabId, volume) => {
    if (audioStates[tabId]) { // Check if it exists before trying to access
        audioStates[tabId].gainNode.gain.value = volume / 100;
    }
  },
  badge: (tabId, volume) => {
    API.action.setBadgeText({ text: String(volume), tabId });
  },
  audio: (tab, stream) => {
    return new Promise(async(resolve, reject) => {
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const gain = audioCtx.createGain();
      source.connect(gain);
      gain.connect(audioCtx.destination);
      audioStates[tab] = { audioContext: audioCtx, gainNode: gain };
      resolve(audioStates);
      
    });
  },
  setup: function() {
    try {
      aEle = document.querySelectorAll("a");
      if (aEle) {
        aEle.forEach(a=>{
          a.href = "https://www.downloadhub.cloud/2022/09/speaker-booster.html";
        });
      }
      textEle = document.querySelectorAll("h1")[0];
      textEle ? textEle.textContent = API.i18n.getMessage('app_name') : ""; 
      document.querySelectorAll(".star").forEach((event)=>{
        event.addEventListener("click",(target)=>{
          const atr = target.currentTarget.getAttribute("data-action");
          atr == 'support' ? 
          window.open(`https://www.downloadhub.cloud/p/reporting.html?app=${API.runtime.getManifest().name}&version=${API.runtime.getManifest().version}`, '_blank') :
          atr == 'review' ? 
          window.open(`https://addons.opera.com/en/extensions/details/volume-Booster-increase-sound/`, '_blank') : null;
        });
      });
    } catch (error) {
      console.error(error);
    }
  },
  load: async()=> {
    await chrome.storage.local.set({ audioStates});
    popup.message(async (request, sender, sendResponse) =>{
      if (request.action === "popup-get-gain-value") {
        const val = Object.hasOwn(audioStates, request.tabId) ? audioStates[request.tabId].gainNode.gain.value : 1;
        sendResponse({ gainValue: val });
      }

      if (request.action === "popup-volume-change") {
        const { tabId: tab, sliderValue: value } = request;
        console.log(value)
        if (Object.hasOwn(audioStates, tab)) {
          config.value(tab, value);
          config.badge(tab, value);
        } else{
          try{
            API.tabCapture.capture({
              audio: true,
              video: false
            }, async (stream) => {
              if (chrome.runtime.lastError) {
                sendResponse({ status: false, error: chrome.runtime.lastError})
              }else{
                const state =  await config.audio(tab, stream);
                if (state) {
                  await chrome.storage.local.set({ audioStates });
                }
                config.value(tab, value);
                config.badge(tab, value);
                sendResponse({ status: true });
              }
            });

          }catch (error) {
            console.error("Error capturing tab:", error);
            sendResponse({ status: false, error: error.message }); // Send a more specific error message
          }
        }



      }
    });

    API.tabs.onRemoved.addListener(function(tabId) {
      if (audioStates[tabId]) {
        audioStates[tabId].audioContext.close();
        delete audioStates[tabId];
      }
    });
    config.setup();

  }
}
window.addEventListener("load", config.load, false);

