/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-5a5d9309'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([
    { "url": "registerSW.js", "revision": "3ca0b8505b4bec776b69afdba2768812" },
    { "url": "index.html", "revision": "0.392h8jr2qs8" },
    // SVG karty
    { "url": "svg/0.svg", "revision": "1" },
    { "url": "svg/1.svg", "revision": "1" },
    { "url": "svg/2.svg", "revision": "1" },
    { "url": "svg/3.svg", "revision": "1" },
    { "url": "svg/4.svg", "revision": "1" },
    { "url": "svg/5.svg", "revision": "1" },
    { "url": "svg/6.svg", "revision": "1" },
    { "url": "svg/7.svg", "revision": "1" },
    { "url": "svg/8.svg", "revision": "1" },
    { "url": "svg/9.svg", "revision": "1" },
    { "url": "svg/cos2pi.svg", "revision": "1" },
    { "url": "svg/cos3pi2.svg", "revision": "1" },
    { "url": "svg/cospi.svg", "revision": "1" },
    { "url": "svg/cospi2.svg", "revision": "1" },
    { "url": "svg/cospi3.svg", "revision": "1" },
    { "url": "svg/cospi4.svg", "revision": "1" },
    { "url": "svg/cospi6.svg", "revision": "1" },
    { "url": "svg/cotgpi2.svg", "revision": "1" },
    { "url": "svg/cotgpi3.svg", "revision": "1" },
    { "url": "svg/cotgpi4.svg", "revision": "1" },
    { "url": "svg/cotgpi6.svg", "revision": "1" },
    { "url": "svg/deleno.svg", "revision": "1" },
    { "url": "svg/der.svg", "revision": "1" },
    { "url": "svg/det.svg", "revision": "1" },
    { "url": "svg/dxdy.svg", "revision": "1" },
    { "url": "svg/e.svg", "revision": "1" },
    { "url": "svg/faktorial.svg", "revision": "1" },
    { "url": "svg/hranataleva.svg", "revision": "1" },
    { "url": "svg/hranataprava.svg", "revision": "1" },
    { "url": "svg/int.svg", "revision": "1" },
    { "url": "svg/kombinace.svg", "revision": "1" },
    { "url": "svg/krat.svg", "revision": "1" },
    { "url": "svg/kulataleva.svg", "revision": "1" },
    { "url": "svg/kulataprava.svg", "revision": "1" },
    { "url": "svg/lim.svg", "revision": "1" },
    { "url": "svg/ln.svg", "revision": "1" },
    { "url": "svg/log.svg", "revision": "1" },
    { "url": "svg/log10.svg", "revision": "1" },
    { "url": "svg/minus.svg", "revision": "1" },
    { "url": "svg/mocnina.svg", "revision": "1" },
    { "url": "svg/mod.svg", "revision": "1" },
    { "url": "svg/odmocneno.svg", "revision": "1" },
    { "url": "svg/pi.svg", "revision": "1" },
    { "url": "svg/plus.svg", "revision": "1" },
    { "url": "svg/sin2pi.svg", "revision": "1" },
    { "url": "svg/sin3pi2.svg", "revision": "1" },
    { "url": "svg/sinpi.svg", "revision": "1" },
    { "url": "svg/sinpi2.svg", "revision": "1" },
    { "url": "svg/sinpi3.svg", "revision": "1" },
    { "url": "svg/sinpi4.svg", "revision": "1" },
    { "url": "svg/sinpi6.svg", "revision": "1" },
    { "url": "svg/skalar.svg", "revision": "1" },
    { "url": "svg/slozenaleva.svg", "revision": "1" },
    { "url": "svg/slozenaprava.svg", "revision": "1" },
    { "url": "svg/sum.svg", "revision": "1" },
    { "url": "svg/tgpi.svg", "revision": "1" },
    { "url": "svg/tgpi3.svg", "revision": "1" },
    { "url": "svg/tgpi4.svg", "revision": "1" },
    { "url": "svg/tgpi6.svg", "revision": "1" },
    { "url": "svg/vektor.svg", "revision": "1" },
    { "url": "svg/velkepi.svg", "revision": "1" },
    { "url": "svg/x.svg", "revision": "1" },
    { "url": "svg/y.svg", "revision": "1" },
    { "url": "svg/zada.svg", "revision": "1" }
  ], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html"), {
    allowlist: [/^\/$/]
  }));

}));