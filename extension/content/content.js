/* global initDownloadSingleImage imageUtil fetchImage urlMap ENV */

(() => {
  let referrerMeta;
  
	browser.runtime.onMessage.addListener(message => {
		switch (message.method) {
			case "getEnv":
				return Promise.resolve(getEnv());
			case "getImages":
				return Promise.resolve(getImages());
			case "fetchImage":
				return fetchImage(message.url)
          .then(data => {
            if (ENV.IS_CHROME) {
              data.blobUrl = URL.createObjectURL(data.blob);
              delete data.blob;
            }
            return data;
          });
			case "revokeURL":
				return URL.revokeObjectURL(message.url);
		}
	});
	
	initDownloadSingleImage({downloadImage});
  
	function downloadImage(url, referrerPolicy = getDefaultReferrerPolicy()) {
		url = urlMap.transform(url);
    browser.runtime.sendMessage({
      method: "singleDownload",
      env: window.top === window ? getEnv() : null,
      url,
      noReferrer: getReferrer(location.href, url, referrerPolicy) !== location.href
    })
      .catch(console.error);
	}
  
	function getImages() {
    const images = new Map;
    for (const img of imageUtil.getAllImages()) {
      const src = imageUtil.getSrc(img);
      if (!src || /^[\w]+-extension/.test(src) || /^about/.test(src)) {
        continue;
      }
      const url = urlMap.transform(src);
      images.set(url, {
        url,
        noReferrer: getReferrer(location.href, url, img.referrerPolicy || getDefaultReferrerPolicy()) !== location.href
      });
    }
		return [...images.values()];
	}
	
	function getEnv() {
		return {
			pageTitle: document.title,
			pageUrl: location.href
		};
	}
  
  function getDefaultReferrerPolicy() {
    if (referrerMeta === undefined) {
      referrerMeta = document.querySelector('meta[name="referrer"]') || null;
    }
    return referrerMeta && referrerMeta.content || "";
  }
  
  function getReferrer(documentUrl, target, policy) {
    if (policy === "no-referrer") {
      return "";
    }
    if (policy === "no-referrer-when-downgrade") {
      return documentUrl.startsWith("https:") && target.startsWith("http:") ?
        "" : documentUrl;
    }
    // FIXME: add more cases
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
    return documentUrl;
  }
})();
