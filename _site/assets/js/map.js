window.onload=function(){

  /*
   * L.Control.ZoomFS - default Leaflet.Zoom control with an added fullscreen button
   * built to work with Leaflet version 0.5
   * https://github.com/elidupuis/leaflet.zoomfs
   */
  L.Control.ZoomFS = L.Control.Zoom.extend({
    includes: L.Mixin.Events,
    onAdd: function (map) {
      var zoomName = 'leaflet-control-zoom',
          barName = 'leaflet-bar',
          partName = barName + '-part',
          container = L.DomUtil.create('div', zoomName + ' ' + barName);

      this._map = map;
      this._isFullscreen = false;

      this._zoomFullScreenButton = this._createButton('<i class="sprite-fullscreen"></i>','Affichage plein écran',
              'leaflet-control-fullscreen ' +
              partName + ' ' +
              partName + '-top',
              container, this.fullscreen, this);

      this._zoomInButton = this._createButton('<i class="sprite-zoom-in"></i>', 'Zoom avant',
              zoomName + '-in ' +
              partName + ' ',
              container, this._zoomIn,  this);

      this._zoomOutButton = this._createButton('<i class="sprite-zoom-out"></i>', 'Zoom arrière',
              zoomName + '-out ' +
              partName + ' ' +
              partName + '-bottom',
              container, this._zoomOut, this);

      map.on('zoomend zoomlevelschange', this._updateDisabled, this);

      return container;

    },
    fullscreen: function() {
      // call appropriate internal function
      if (!this._isFullscreen) {
        this._enterFullScreen();
      } else {
        this._exitFullScreen();
      }

      // force internal resize
      this._map.invalidateSize();
    },
    _enterFullScreen: function() {
      var container = this._map._container;

      // apply our fullscreen settings
      container.style.position = 'fixed';
      container.style.left = 0;
      container.style.top = 0;
      container.style.width = '100%';
      container.style.height = '100%';

      // store state
      L.DomUtil.addClass(container, 'leaflet-fullscreen');
      this._isFullscreen = true;

      // add ESC listener
      L.DomEvent.addListener(document, 'keyup', this._onKeyUp, this);

      // fire fullscreen event on map
      this._map.fire('enterFullscreen');
    },
    _exitFullScreen: function() {
      var container = this._map._container;

      // update state
      L.DomUtil.removeClass(container, 'leaflet-fullscreen');
      this._isFullscreen = false;

      // remove fullscreen style; make sure we're still position relative for Leaflet core.
      container.removeAttribute('style');

      // re-apply position:relative; if user does not have it.
      var position = L.DomUtil.getStyle(container, 'position');
      if (position !== 'absolute' && position !== 'relative') {
        container.style.position = 'relative';
      }

      // remove ESC listener
      L.DomEvent.removeListener(document, 'keyup', this._onKeyUp);

      // fire fullscreen event
      this._map.fire('exitFullscreen');
    },
    _onKeyUp: function(e) {
      if (!e) e = window.event;
      if (e.keyCode === 27 && this._isFullscreen === true) {
        this._exitFullScreen();
      }
    }
  });

  /*
   * Extends L.Map to synchronize two maps
   */

  L.Map = L.Map.extend({
      sync: function (map) {

          this._syncMap = L.extend(map, {
              setView: function (center, zoom, options, sync) {
                  if (!sync) {
                      this._syncMap.setView(center, zoom, options, true);
                  }
                  return L.Map.prototype.setView.call(this, center, zoom, options);
              },

              panBy: function (offset, options, sync) {
                  if (!sync) {
                      this._syncMap.panBy(offset, options, true);
                  }
                  return L.Map.prototype.panBy.call(this, offset, options);
              },

              _onResize: function (evt, sync) {
                  if (!sync) {
                      this._syncMap._onResize(evt, true);
                  }
                  return L.Map.prototype._onResize.call(this, evt);
              }
          });

          this.on('zoomend', function() {
              this._syncMap.setView(this.getCenter(), this.getZoom(), {reset: false}, true);
          }, this);

          this.dragging._draggable._updatePosition = function () {
              L.Draggable.prototype._updatePosition.call(this);
              L.DomUtil.setPosition(map.dragging._draggable._element, this._newPos);
              map.fire('move');
          };

          return this;
      },
      fitBounds: function (bounds, options) {

        options = options || {};
        bounds = bounds.getBounds ? bounds.getBounds() : L.latLngBounds(bounds);

        var paddingTL = L.point(options.paddingTopLeft || options.padding || [0, 0]),
            paddingBR = L.point(options.paddingBottomRight || options.padding || [0, 0]),

            zoom = this.getBoundsZoom(bounds, false, paddingTL.add(paddingBR)),
            paddingOffset = paddingBR.subtract(paddingTL).divideBy(2),

            swPoint = this.project(bounds.getSouthWest(), zoom),
            nePoint = this.project(bounds.getNorthEast(), zoom),
            center = this.unproject(swPoint.add(nePoint).divideBy(2).add(paddingOffset), zoom);

        return this.setView(center, zoom, options);
      }
  });

  // #################
  // Leaflet hash
  // #################

var HAS_HASHCHANGE = (function() {
    var doc_mode = window.documentMode;
    return ('onhashchange' in window) &&
      (doc_mode === undefined || doc_mode > 7);
  })();

  L.Hash = function(map, callback) {
    this.onHashChange = L.Util.bind(this.onHashChange, this);

    if (map) {
      this.init(map, callback);
    }
  };

  L.Hash.prototype = {
    map: null,
    lastHash: null,

    parseHash: function(hash) {
      if(hash.indexOf('#') === 0) {
        hash = hash.substr(1);
      }
      var compare;
      var args = hash.split("!");
      if(args.length == 2) {
        compare = args[1];
        document.querySelector("form#compare-with input[value='"+compare+"']").checked=true
        Ortho44.compareWith(map, "map-compare", older_layers["ortho"+compare]);
      }
      args = args[0].split("/");
      if (args.length == 3) {
        var zoom = parseInt(args[0], 10),
        lat = parseFloat(args[1]),
        lon = parseFloat(args[2]);
        if (isNaN(zoom) || isNaN(lat) || isNaN(lon)) {
          return false;
        } else {
          return {
            center: new L.LatLng(lat, lon),
            zoom: zoom
          };
        }
      } else {
        return false;
      }
    },

    formatHash: function(map) {
      var center = map.getCenter(),
          zoom = map.getZoom(),
          precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2));

      var newhash = "#" + [zoom,
        center.lat.toFixed(precision),
        center.lng.toFixed(precision)
      ].join("/");
      if(document.querySelector("form#compare-with input:checked")) {
        newhash += "!" + document.querySelector("form#compare-with input:checked").value;
      }
      return newhash
    },

    init: function(map, callback) {
      this.map = map;
      this._callback = callback;

      // reset the hash
      this.lastHash = null;
      this.onHashChange();

      if (!this.isListening) {
        this.startListening();
      }
    },

    remove: function() {
      if (this.changeTimeout) {
        clearTimeout(this.changeTimeout);
      }

      if (this.isListening) {
        this.stopListening();
      }

      this.map = null;
    },

    onMapMove: function() {
      // bail if we're moving the map (updating from a hash),
      // or if the map is not yet loaded

      if (this.movingMap || !this.map._loaded) {
        return false;
      }

      var hash = this.formatHash(this.map);
      if (this.lastHash != hash) {
        location.replace(hash);
        this.lastHash = hash;
      }
    },

    movingMap: false,
    update: function() {
      var hash = location.hash;
      if (hash === this.lastHash) {
        return;
      }
      var parsed = this.parseHash(hash);
      if (parsed) {
        this.movingMap = true;

        this.map.setView(parsed.center, parsed.zoom);
        if(this._callback) this._callback();

        this.movingMap = false;
      } else {
        this.onMapMove(this.map);
      }
    },

    // defer hash change updates every 100ms
    changeDefer: 100,
    changeTimeout: null,
    onHashChange: function() {
      // throttle calls to update() so that they only happen every
      // `changeDefer` ms
      if (!this.changeTimeout) {
        var that = this;
        this.changeTimeout = setTimeout(function() {
          that.update();
          that.changeTimeout = null;
        }, this.changeDefer);
      }
    },

    isListening: false,
    hashChangeInterval: null,
    startListening: function() {
      this.map.on("moveend", this.onMapMove, this);

      if (HAS_HASHCHANGE) {
        L.DomEvent.addListener(window, "hashchange", this.onHashChange);
      } else {
        clearInterval(this.hashChangeInterval);
        this.hashChangeInterval = setInterval(this.onHashChange, 50);
      }
      this.isListening = true;
    },

    stopListening: function() {
      this.map.off("moveend", this.onMapMove, this);

      if (HAS_HASHCHANGE) {
        L.DomEvent.removeListener(window, "hashchange", this.onHashChange);
      } else {
        clearInterval(this.hashChangeInterval);
      }
      this.isListening = false;
    }
  };
  L.hash = function(map) {
    return new L.Hash(map);
  };
  L.Map.prototype.addHash = function() {
    this._hash = L.hash(this);
  };
  L.Map.prototype.removeHash = function() {
    this._hash.remove();
  };

  // ############################
  // Screenshot
  // ############################
  L.Control.Screenshot = L.Control.extend({
    includes: L.Mixin.Events,
    options: {
        position: 'bottomleft',
        title: 'Impression'
    },

    screenshot: function () {
        Ortho44.fadeOut("#overlay", 40, function() {
          var page = location.href;
          var screamshot = "http://screamshot.makina-corpus.net/capture/?render=html&waitfor=.map-initialized&url=";
          window.open(screamshot + encodeURIComponent(page));
        });
    },

    onAdd: function(map) {
        this.map = map;
        this._container = L.DomUtil.create('div', 'leaflet-print-control leaflet-control');
        var link = L.DomUtil.create('a', 'leaflet-bar-part leaflet-bar-part-single leaflet-screenshot-control', this._container);
        link.href = '#';
        link.title = this.options.title;
        var span = L.DomUtil.create('span', 'sprite-print', link);

        L.DomEvent
            .addListener(link, 'click', L.DomEvent.stopPropagation)
            .addListener(link, 'click', L.DomEvent.preventDefault)
            .addListener(link, 'click', this.screenshot, this);
        return this._container;
    }
  });
  L.control.screenshot = function(map) {
    return new L.Control.Screenshot(map);
  };

  // ############################
  // Image download
  // ############################
  L.Control.ImageDownload = L.Control.extend({
    includes: L.Mixin.Events,
    options: {
      position: 'bottomleft',
      title: "Exporter les images"
    },

    download: function () {
      var p = document.querySelector("#download-link");
      if(this.map.getZoom()>13) {
        var bounds = this.map.getBounds();
        var wms = "http://services.vuduciel.loire-atlantique.fr/geoserver/wms/?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&BBOX="+bounds.getSouthWest().lat+","+bounds.getSouthWest().lng+","+bounds.getNorthEast().lat+","+bounds.getNorthEast().lng+"&SRS=EPSG:4326&WIDTH=1351&HEIGHT=736&LAYERS=tif80&STYLES=&FORMAT=image/png&DPI=96&MAP_RESOLUTION=96&FORMAT_OPTIONS=dpi:96&TRANSPARENT=TRUE";
        var download_url = "http://services.vuduciel.loire-atlantique.fr/download?x0="+bounds.getSouthWest().lng+"&y0="+bounds.getSouthWest().lat+"&x1="+bounds.getNorthEast().lng+"&y1="+bounds.getNorthEast().lat
        var message = "<p>Pour télécharger l'image complète de la position actuelle, veuillez cliquer sur le lien ci-dessous.</p>"
        message += "<p>Note: le temps de chargement peut être assez long suivant la taille de la zone affichée.</p>";
        message += "<p><a href='"+download_url+"' id= target='_new'>Télécharger l'image en dalles ECW</a></p>";
        //message += "<p><a href='"+wms+"' id= target='_new'>Télécharger l'image haute résolution JPG</a></p>";
        p.innerHTML = message;
      } else {
        p.innerHTML = "<strong>La zone sélectionnée est trop importante, merci de la réduire.</strong>"
      }
      
    },

    onAdd: function(map) {
      this.map = map;
      this._container = L.DomUtil.create('div', 'leaflet-control-actionlink leaflet-control');
      var link = L.DomUtil.create('a', 'sprite-download leaflet-download-control', this._container);
      link.href = '#';
      link.title = this.options.title;
      link.setAttribute("data-reveal-id", "download-infos");
      link.textContent = "Exporter l'image";
      var help = L.DomUtil.create('span', 'sprite-question has-tip tip-top noradius', this._container);
      help.setAttribute('data-tooltip', "");
      help.setAttribute('title', "Fonction permettant de télécharger les images en haute résolution, avec leurs coordonnées.");
      L.DomEvent
        .addListener(link, 'click', this.download, this);
      return this._container;
    }
  });
  L.control.imageDownload = function(map) {
    return new L.Control.ImageDownload(map);
  };

  // ############################
  // WMS link
  // ############################
  L.Control.WMSLink = L.Control.extend({
    includes: L.Mixin.Events,
    options: {
      position: 'bottomleft',
      title: "Accéder au serveur WMS"
    },

    display: function () {
      
    },

    onAdd: function(map) {
      this.map = map;
      this._container = L.DomUtil.create('div', 'leaflet-control-actionlink leaflet-control leaflet-wms-control');
      var link = L.DomUtil.create('a', 'sprite-zrss', this._container);
      link.href = '#';
      link.title = this.options.title;
      link.setAttribute("data-reveal-id", "wms-infos");
      link.textContent = 'Accéder au serveur WMS';
      var help = L.DomUtil.create('span', 'sprite-question has-tip tip-top noradius', this._container);
      help.setAttribute('data-tooltip', "");
      help.setAttribute('title', "Fonction permettant d'accéder au serveur WMS du site.");
      L.DomEvent
        .addListener(link, 'click', this.display, this);
      return this._container;
    }
  });
  L.control.wmsLink = function(map) {
    return new L.Control.WMSLink(map);
  };

  // ############################
  // Social buttons
  // ############################
  L.Control.Social = L.Control.extend({
    includes: L.Mixin.Events,
    options: {
        position: 'bottomleft',
        title: 'Social networks',
        text: "Photographies aériennes de Cannes",
        links: [
          ['facebook', "Partager sur Facebook", "https://www.facebook.com/sharer.php?u=_url_&t=_text_"],
          ['twitter', "Partager sur Twitter", "http://twitter.com/intent/tweet?text=_text_&url=_url_"],
          ['google-plus', "Partager sur Google Plus", "https://plus.google.com/share?url=_url_"]
        ]
    },

    share: function () {
      var url = this.link;
      url = url.replace(/_text_/, encodeURIComponent(this.self.options.text));
      url = url.replace(/_url_/, encodeURIComponent(location.href));
      window.open(url);
    },

    onAdd: function(map) {
        this.map = map;
        this._container = L.DomUtil.create('div', 'leaflet-control');
        for (var i = 0; i < this.options.links.length; i++) {
          infos = this.options.links[i];
          var div = L.DomUtil.create('div', 'leaflet-social-control', this._container);
          var link = L.DomUtil.create('a', 'leaflet-bar-part leaflet-bar-part-single leaflet-social-control-'+infos[0], div);
          link.href = infos[2];
          link.title = infos[1];
          var span = L.DomUtil.create('i', 'sprite-'+infos[0], link);

          L.DomEvent
              .addListener(link, 'click', L.DomEvent.stopPropagation)
              .addListener(link, 'click', L.DomEvent.preventDefault)
              .addListener(link, 'click', this.share, {self: this, link: infos[2]});
        };
        
        return this._container;
    }
  });
  L.control.social = function(map) {
    return new L.Control.Social(map);
  };

  // ############################
  // Snippet
  // ############################
  L.Control.Snippet = L.Control.extend({
    includes: L.Mixin.Events,
    options: {
        position: 'bottomleft',
        title: 'Partager sur votre site ou blog'
    },

    generate: function() {
      var center = this.map.getCenter(),
          zoom = this.map.getZoom(),
          precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2));

      script = document.querySelector("#snippet #snippet-template").textContent;
      script = script.replace(/_zoom_/, zoom);
      script = script.replace(/_lat_/, center.lat.toFixed(precision));
      script = script.replace(/_lon_/, center.lng.toFixed(precision));
      document.querySelector("#snippet #snippet-code").textContent = script;
    },
    onAdd: function(map) {
        this.map = map;
        this._container = L.DomUtil.create('div', 'leaflet-control-embed leaflet-control');
        var link = L.DomUtil.create('a', 'leaflet-bar-part leaflet-bar-part-single leaflet-snippet-control', this._container);
        link.href = '#';
        link.title = this.options.title;
        link.setAttribute("data-reveal-id", "snippet");
        var span = L.DomUtil.create('i', 'sprite-code', link);

        L.DomEvent
        //     .addListener(link, 'click', L.DomEvent.stopPropagation)
        //     .addListener(link, 'click', L.DomEvent.preventDefault)
             .addListener(link, 'click', this.generate , this);

        return this._container;
    }
  });
  L.control.snippet = function(map) {
    return new L.Control.Snippet(map);
  };

  // ############################
  // Locator
  // ############################
  L.Control.Locator = L.Control.extend({
    includes: L.Mixin.Events,
    options: {
        position: 'topleft',
        title: 'Localisation'
    },

    locate: function() {
      this.map.locate();
    },
    onAdd: function(map) {
        this.map = map;
        this._container = L.DomUtil.create('div', 'leaflet-control-zoom leaflet-control');
        var div = L.DomUtil.create('div', 'leaflet-bar', this._container);
        var link = L.DomUtil.create('a', 'leaflet-bar-part leaflet-bar-part-single leaflet-locate-control', div);
        link.href = '#';
        link.title = this.options.title;
        var span = L.DomUtil.create('i', 'sprite-zposition', link);

        L.DomEvent
             .addListener(link, 'click', L.DomEvent.stopPropagation)
             .addListener(link, 'click', L.DomEvent.preventDefault)
             .addListener(link, 'click', this.locate , this);

        return this._container;
    }
  });
  L.control.locator = function(map) {
    return new L.Control.Locator(map);
  };
  // ############################
  // WMTS
  // ############################
  /*
   * Copyright (c) 2008-2013 Institut National de l'information Geographique et forestiere France, released under the
   * BSD license.
   */
  L.TileLayer.WMTS = L.TileLayer.extend({

          defaultWmtsParams: {
                  service: 'WMTS',
                  request: 'GetTile',
                  version: '1.0.0',
                  layer: '',
                  style: '',
                  tilematrixSet: '',
                  format: 'image/jpeg'
          },

          initialize: function (url, options) { // (String, Object)
                  this._url = url;
                  var wmtsParams = L.extend({}, this.defaultWmtsParams),
                      tileSize = options.tileSize || this.options.tileSize;
                  if (options.detectRetina && L.Browser.retina) {
                          wmtsParams.width = wmtsParams.height = tileSize * 2;
                  } else {
                          wmtsParams.width = wmtsParams.height = tileSize;
                  }
                  for (var i in options) {
                          // all keys that are not TileLayer options go to WMTS params
                          if (!this.options.hasOwnProperty(i) && i!="matrixIds") {
                                  wmtsParams[i] = options[i];
                          }
                  }
                  this.wmtsParams = wmtsParams;
                  this.matrixIds = options.matrixIds;
                  L.setOptions(this, options);
          },

          onAdd: function (map) {
                  L.TileLayer.prototype.onAdd.call(this, map);
          },

          getTileUrl: function (tilePoint, zoom) { // (Point, Number) -> String
                  var map = this._map;
                  crs = map.options.crs;
                  tileSize = this.options.tileSize;
                  nwPoint = tilePoint.multiplyBy(tileSize);
                  //+/-1 to get in tile
                  nwPoint.x+=1;
                  nwPoint.y-=1; 
                  sePoint = nwPoint.add(new L.Point(tileSize, tileSize)); 
                  nw = crs.project(map.unproject(nwPoint, zoom));
                  se = crs.project(map.unproject(sePoint, zoom));  
                  tilewidth = se.x-nw.x;
                  zoom=map.getZoom();
                  ident = this.matrixIds[zoom].identifier;
                  X0 = this.matrixIds[zoom].topLeftCorner.lng;
                  Y0 = this.matrixIds[zoom].topLeftCorner.lat;
                  tilecol=Math.floor((nw.x-X0)/tilewidth);
                  tilerow=-Math.floor((nw.y-Y0)/tilewidth);
                  url = L.Util.template(this._url, {s: this._getSubdomain(tilePoint)});
                  return url + L.Util.getParamString(this.wmtsParams, url) + "&tilematrix=" + ident + "&tilerow=" + tilerow +"&tilecol=" + tilecol ;
          },

          setParams: function (params, noRedraw) {
                  L.extend(this.wmtsParams, params);
                  if (!noRedraw) {
                          this.redraw();
                  }
                  return this;
          }
  });

  L.tileLayer.wtms = function (url, options) {
          return new L.TileLayer.WMTS(url, options);
  };

  // ###################################
  // TileLayer fallback
  // Fallback to PNG if JPG is not available to allow transparency on borders
  // ###################################
  L.FallbackTileLayer = L.TileLayer.extend({

    _tileOnError: function () {
      var layer = this._layer;

      layer.fire('tileerror', {
        tile: this,
        url: this.src
      });

      var newUrl;
      if(this.src.indexOf(".jpg")>0) {
        layer._limit = true;
        newUrl = this.src.replace("jpg", "png");
      } else {
        newUrl = layer.options.errorTileUrl;
      }
      if (newUrl) {
        this.src = newUrl;
      }

      layer._tileLoaded();
      
    },

    reachLimit: function() {
      return this._limit;
    }
  });

  // ###################################
  // Ortho 44 specific geocoding & utils
  // ###################################

  var Ortho44 = {
    _callbackIndex: 0,
    cachePlaceholder: document.querySelector("#search-input").getAttribute("placeholder"),

    // GEOCODING
    // -----------
    bindGeocode: function(form, input, map, callback) {
      L.DomEvent.addListener(form, 'submit', this._geocode, this);
      var clearInput = function() {
        console.log(Ortho44.cachePlaceholder);
        this.setAttribute("placeholder", "");
        if(this.className == "random-display") {
          this.value = "";
          Ortho44.removeClass(this, "random-display");
        }
      };
      var resetInput = function() {
        console.log(Ortho44.cachePlaceholder);
        this.setAttribute("placeholder", Ortho44.cachePlaceholder);
      };
      L.DomEvent.addListener(input, 'click', clearInput, input);
      L.DomEvent.addListener(input, 'focus', clearInput, input);
      L.DomEvent.addListener(input, 'focusout', resetInput, input);
      this._map = map;
      this._input = input;
      this._callback = callback;
      Ortho44.setClass(document.getElementById('search-address'), "search-ready");
    },

    _loadElasticSearchJSONP: function (params) {
      var url = "http://elastic.makina-corpus.net/cg44/address/_search" + L.Util.getParamString(params);
      var script = document.createElement("script");
      script.type = "text/javascript";
      script.src = url;
      document.getElementsByTagName("head")[0].appendChild(script);
      //document.getElementsByTagName("head")[0].removeChild(script);
    },

    _geocode: function (event) {
      L.DomEvent.preventDefault(event);
      var self = this;
      window._l_ortho44geocoder_namelookup = function(results) {
        if(results.hits.total == 0) {
          window._l_ortho44geocoder_fullsearch = L.Util.bind(self._callback, self);
          /* search any macth */
          self._loadElasticSearchJSONP({q: self._input.value, default_operator:"AND", callback: "_l_ortho44geocoder_fullsearch"});
        } else {
          self._callback(results);
        }
      };

      /* search name only */
      this._loadElasticSearchJSONP({
        source: JSON.stringify({
          query: {
                query_string: {
                    fields: ["nom", "type"],
                    query: this._input.value + " AND COMMUNE",
                    default_operator: "AND"
                }
            }
        }),
        callback : "_l_ortho44geocoder_namelookup"
      });
    },

    _getLabel: function(hit, mode) {
      var label = "";
      if(hit.nom) {
        label = hit.nom;
        if(hit.type && hit.type == "LIEUDIT") {
          label += " (Lieu-dit)"
          if(hit.commune) {
            label += " - <strong>" + hit.commune + "</strong>";
          }
        } else {
          label = "<strong>" + label + "</strong>";
        }
      } else {
        label = (mode == "POPUP" && hit.numero ? hit.numero + ' ':'') + (hit.nom_voie ? hit.nom_voie + ' - ':'') + (hit.nom_ld ? hit.nom_ld + ', ':'') + '<strong>' + (hit.commune ? hit.commune:'') + '</strong>';
      }
      return label;
    },
    showResult: function(hit) {
      var label = Ortho44._getLabel(hit, "POPUP");
      Ortho44.current_result = {"type": "Feature",
        "properties": {
            "name": label
        },
        "geometry": hit.geometry
      };
      resultsLayer.clearLayers();
      L.geoJson(Ortho44.current_result, {
        style: function (feature) {
          if(feature.geometry.type=='Polygon') return {fillColor: 'transparent'};
        },
        onEachFeature: function onEachFeature(feature, layer) {
            layer.bindPopup(feature.properties.name);
        }
      }).addTo(resultsLayer);
      var bounds = resultsLayer.getBounds();
      if (bounds.isValid()) {
        if(document.querySelector(".compare-mode")) {
          map.fitBounds(bounds, {paddingTopLeft: [-Math.round($(window).width()/2), 0]});
          L.geoJson(Ortho44.current_result, {
            style: function (feature) {
              if(feature.geometry.type=='Polygon') return {fillColor: 'transparent'};
            }
          }).addTo(Ortho44.mapcompare);
        } else {
          map.fitBounds(bounds);
        }
      }
    },

    // COMPARISON MAP
    // ---------------
    compareWith: function(map, compare_container, layer_param) {
      // clean compare map if exist
      if(Ortho44.mapcompare) Ortho44.compareClean();

      // set classes
      Ortho44.removeClass(document.getElementById(compare_container), "map-hidden");
      Ortho44.setClass(document.getElementById(compare_container), "map-right");
      Ortho44.setClass(document.querySelector("body"), "compare-mode");

      // bind fullscreen
      map.on("enterFullscreen", function() {
        if(Ortho44.mapcompare) {
          var container = document.getElementById(compare_container);
          container.style.position = 'fixed';
          container.style.top = 0;
          container.style.height = '100%';  
          Ortho44.mapcompare.invalidateSize();
        }
      });
      map.on("exitFullscreen", function() {
        if(Ortho44.mapcompare) document.getElementById(compare_container).removeAttribute("style");
      });

      // create map and sync it
      Ortho44.mapcompare = L.map(compare_container,
        {
          maxBounds: map.options.maxBounds,
          zoomControl:false,
          attribution: ''
        }
      );

      var layer = new L.FallbackTileLayer(layer_param.url, layer_param.options);
      var maxZoom = layer.options.maxZoom;
      map._layersMaxZoom = maxZoom;

      layer.addTo(Ortho44.mapcompare);
      map.sync(Ortho44.mapcompare);
      Ortho44.mapcompare.sync(map);

      // re-center on the left
      map.fitBounds(map.getBounds(), {paddingTopLeft: [-Math.round($(window).width()/2), 0]});

      // display search result if any
      if(Ortho44.current_result) {
        L.geoJson(Ortho44.current_result, {
          style: function (feature) {
            if(feature.geometry.type=='Polygon') return {fillColor: 'transparent'};
          }
        }).addTo(Ortho44.mapcompare);
      }

      // display position markers
      Ortho44.cursorl = L.circleMarker([0,0], {radius:20, fillOpacity: 0.2, color: '#b1ca00', fillColor: '#fff'}).addTo(map);
      Ortho44.cursorr = L.circleMarker([0,0], {radius:20, fillOpacity: 0.2, color: '#b1ca00', fillColor: '#fff'}).addTo(Ortho44.mapcompare);
      map.on('mousemove', function (e) {
        Ortho44.cursorl.setLatLng(e.latlng);
        Ortho44.cursorr.setLatLng(e.latlng);
      });
      Ortho44.mapcompare.on('mousemove', function (e) {
        Ortho44.cursorl.setLatLng(e.latlng);
        Ortho44.cursorr.setLatLng(e.latlng);
      });
    },

    compareOff: function(map) {
      if(Ortho44.mapcompare) {
        // reset classes
        Ortho44.setClass(Ortho44.mapcompare._container, "map-hidden");
        Ortho44.removeClass(Ortho44.mapcompare._container, "map-right");
        Ortho44.removeClass(document.querySelector("body"), "compare-mode");

        // clean compare map
        Ortho44.compareClean();

        // reset main map
        map.off('mousemove zoom enterFullscreen exitFullscreen');
        map._layersMaxZoom = 19;
      }
    },
    compareClean: function() {
      map.fitBounds(map.getBounds(), {paddingTopLeft: [Math.round($(window).width()/2), 0]});
      var parent = Ortho44.mapcompare._container.parentNode;
      parent.removeChild(Ortho44.mapcompare._container);
      var newMapContainer = document.createElement('div');
      newMapContainer.setAttribute('id', "map-compare");
      newMapContainer.setAttribute('class', "map-hidden");
      parent.insertBefore(newMapContainer, map._container.nextSibling);
      map.removeLayer(Ortho44.cursorl);
      delete Ortho44.cursorr;
      delete Ortho44.mapcompare;
    },

    // UTILS
    // -----------
    setClass: function (element, cl) {
      var classes = element.className,
          pattern = new RegExp( cl );
          hasClass = pattern.test( classes );
      classes = hasClass ? classes : classes + ' ' + cl;
      element.className = classes.trim()
    },
    removeClass: function (element, cl) {
      var classes = element.className,
          pattern = new RegExp( cl );
          hasClass = pattern.test( classes );
      classes = hasClass ? classes.replace( pattern, '' ) : classes;
      element.className = classes.trim()
    },

    fadeOut: function(selector, interval, callback) {
      document.querySelector(selector).style.display="block";
      var opacity = 9;

      function func() {
          document.querySelector(selector).style.opacity = "0." + opacity;
          opacity--;

          if (opacity == -1) {
            window.clearInterval(fading);
            document.querySelector(selector).style.display="none";
            if(callback) callback();
          }
      }

      var fading = window.setInterval(func, interval);
    },

    randomDisplay: function() {
      var niceLocations = [
        ["Bocca nord", 15, 43.5628, 6.9673],
        ["Bocca sud", 15, 43.5507, 6.9734],
        ["Californie", 15, 43.5582, 7.0413],
        ["Carnot", 15, 43.5579, 7.0181],
        ["Centre ville - Croisette", 15, 43.54929, 7.02261],
        ["Croix-des-Gardes", 15, 43.5565, 6.9961],
        ["Iles de Lérins", 15, 43.5160, 7.0532],
        ["Pointe Croisette", 15, 43.5407, 7.0406],
        ["Prado - République", 15, 43.5584, 7.0255],
        ["Riou - Petit Juas", 15, 43.5592, 7.0101],
        ["Suquet", 15, 43.55015, 7.01279],
      ];
      var random = niceLocations[Math.floor(Math.random()*niceLocations.length)];
      map.setView([random[2], random[3]], random[1]);
      if(!location.hash) {
        document.getElementById("search-input").value = random[0];
        Ortho44.setClass(document.getElementById('search-input'), "random-display");
      }
    }

  };

  // #############
  //  MAP INIT
  // #############

  var max_bounds_strict = new L.LatLngBounds(new L.LatLng(43.5, 6.92), new L.LatLng(43.59, 7.09));
  var max_bounds_buffer = new L.LatLngBounds(new L.LatLng(43.5, 6.92), new L.LatLng(43.59, 7.09));
  var map = L.map('map',
      {
        maxBounds: max_bounds_buffer,
        zoomControl:false
      }
    );

  map.attributionControl.setPrefix('Source: Département de Loire-Atlantique');
  map.on('load', function() {
    var hash = new L.Hash(map);
  });
  Ortho44.randomDisplay();

  // LAYERS
  var streets_mapquest = L.tileLayer('http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpeg', {
    opacity: 0.5,
    minZoom: 9,
    maxZoom: 12,
    attribution: "MapQuest / OpenStreetMap",
    subdomains: '1234'
  });

  var matrixIds3857= new Array(22);
  for (var i= 0; i<22; i++) {
      matrixIds3857[i]= {
          identifier    : "" + i,
          topLeftCorner : new L.LatLng(20037508,-20037508)
      };
  }
  
  var ign_keys = {
    'localhost': 'ymg58ktvpimfa7zyxjxyr1a5',
    'makinacorpus.github.io' : '9z9o6i52lxwch6mxt9wmwro5',
    'vuduciel.loire-atlantique.fr' :'287bdvzzjnxqhh4s0mqfto41'
  };
  var ign_key = ign_keys[location.hostname];
  var ign = new L.TileLayer.WMTS("http://wxs.ign.fr/"+ign_key+"/geoportail/wmts",
    {
      layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
      style: 'normal',
      maxZoom: 19,
      minZoom: 13,
      tilematrixSet: "PM",
      matrixIds: matrixIds3857,
      format: 'image/jpeg',
      attribution: "&copy; IGN"
    }
  );

  var ortho2009 = new L.tileLayer.wms("http://cannesig.oxyd.net/geoserver/wms", {
        layers: 'orthophoto2009',
        format: 'image/jpeg',
        styles: 'ortho_2004_15cm',
        transparent: false,
        attribution: "Cannes",
        crs:L.CRS.EPSG4326
    }).addTo(map);


  // CONTROLS
  var osm = new L.TileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom: 11, attribution: "Map data &copy; OpenStreetMap contributors"});
  var miniMap = new L.Control.MiniMap(osm, {
    zoomLevelFixed: 7,
    fixedPosition: true,
    center: [7.02, 43.56],
    width: 160
  }).addTo(map);

  map.on('locationerror', function() {
    console.log("Too far away, keep default location");
  });
  var streets_custom_osm = L.tileLayer('http://{s}.tiles.vuduciel.loire-atlantique.fr/osm/{z}/{x}/{y}.png', {
    opacity: 0.8,
    maxZoom: 19,
    attribution: "Makina Corpus / OpenStreetMap",
    subdomains: 'abcdefgh'
  });
  var older_layers = {
    'ortho1814': {url:'http://{s}.tiles.vuduciel.loire-atlantique.fr/ortho-1850/{z}/{x}/{y}.jpg', options: {
      maxZoom: 16,
      tms: true,
      subdomains: 'abcdefgh'
    }},
    'ortho1884': {url:'http://{s}.tiles.vuduciel.loire-atlantique.fr/ortho-1949/{z}/{x}/{y}.jpg', options: {
      maxZoom: 18,
      tms: true,
      subdomains: 'abcdefgh'
    }},
    'ortho1948': {url:'http://{s}.tiles.vuduciel.loire-atlantique.fr/ortho-1999/{z}/{x}/{y}.jpg', options: {
      maxZoom: 18,
      tms: true,
      subdomains: 'abcdefgh'
    }},
    'ortho1999': {url:'http://{s}.tiles.vuduciel.loire-atlantique.fr/ortho-2004/{z}/{x}/{y}.jpg', options: {
      maxZoom: 18,
      tms: true,
      subdomains: 'abcdefgh'
    }},
    'ortho2004': {url:'http://{s}.tiles.vuduciel.loire-atlantique.fr/ortho-2009/{z}/{x}/{y}.jpg', options: {
      maxZoom: 18,
      tms: true,
      subdomains: 'abcdefgh'
    }}
  };

  L.control.locator().addTo(map);
  (new L.Control.ZoomFS()).addTo(map);
  var overlayMaps = {
    "Afficher les rues": streets_custom_osm,
  };
  L.control.layers(null, overlayMaps,
    {position: "topleft"}
  ).addTo(map);
  L.control.imageDownload().addTo(map);
  L.control.wmsLink().addTo(map);
  L.control.screenshot().addTo(map);
  L.control.snippet().addTo(map);
  L.control.social().addTo(map);
  L.control.scale({'imperial': false, 'position': 'bottomright'}).addTo(map);
  
  var resultsLayer = L.featureGroup().addTo(map);

  L.DomEvent.addListener(document.getElementById("search-input"), 'keyup', function(e) {
    if(e.keyCode != 13) {
      Ortho44.removeClass(document.getElementById('search-address'), "search-no-result");
      Ortho44.removeClass(document.getElementById('search-address'), "search-success");
    }
  }, this);

  Ortho44.bindGeocode(
    document.getElementById('search-address'),
    document.getElementById("search-input"),
    map,
    function (results) {
      var choices_box = document.getElementById('choice-list');
      Ortho44.removeClass(choices_box, "show-choices");
      if(results.hits.total > 0) {
        var best = results.hits.hits[0]._source;
        if(results.hits.total==1) {
          Ortho44.showResult(best);
        } else {
          var choices = {};
          for(var i=0;i<results.hits.hits.length;i++) {
            var hit = results.hits.hits[i]._source;
            var choice_label = Ortho44._getLabel(hit, "LISTING");
            //hit.nom ? hit.nom : (hit.nom_voie ? hit.nom_voie + ', ':'') + (hit.nom_ld ? hit.nom_ld + ', ':'') + '<strong>' + hit.commune + "</strong>";
            choices[choice_label] = hit;
          }

          choices_box.innerHTML = "";
          distinct = [];
          for(var choice in choices) {
            distinct.push(choice);
            var li = document.createElement("li");
            li.innerHTML = choice;
            L.DomEvent.addListener(li, 'click', (function(label, hit) {
              return function(){
                document.getElementById("search-input").value = label;
                Ortho44.removeClass(choices_box, "show-choices");
                Ortho44.showResult(hit);
              }
            }(li.textContent, choices[choice])));
            choices_box.appendChild(li);
          }
          if(distinct.length == 1) {
            Ortho44.showResult(best);
          } else {
            Ortho44.setClass(choices_box, "show-choices");
          }
        }
        Ortho44.setClass(document.getElementById('search-address'), "search-success");
        Ortho44.removeClass(document.getElementById('search-address'), "search-no-result");
      } else {
        resultsLayer.clearLayers();
        Ortho44.setClass(document.getElementById('search-address'), "search-no-result");
        Ortho44.removeClass(document.getElementById('search-address'), "search-success");
        choices_box.innerHTML = "";
        var p = document.createElement("p");
        p.textContent = "Aucun résultat trouvé.";
        choices_box.appendChild(p);
        Ortho44.setClass(choices_box, "show-choices");
      }
    });
  
  // SECONDARY MAP
  L.DomEvent.addListener(document.querySelector("form#compare-with"), 'change', function(e) {
    if(e.target.checked) {
      var inputs = document.querySelectorAll("form#compare-with input");
      for(var i=0; i<inputs.length; i++) {
        if(inputs[i].id != e.target.id) inputs[i].checked = false;
      }
      Ortho44.compareWith(map, "map-compare", older_layers["ortho"+e.target.value]);
    } else {
      Ortho44.compareOff(map);
      var inputs = document.querySelectorAll("form#compare-with input");
      for(var i=0; i<inputs.length; i++) {
        inputs[i].checked = false;
      }
    }
  });
  
  // FOUNDATION INIT
  $(document).foundation(null, null, null, null, true);
  $(document).foundation('dropdown', 'off');
  $("nav li.overlay a").each(function(i, el) {
    $(el).click(function(event) {
      $('#secondary-page-zone').html="Chargement";
      $('#secondary-page-reveal').foundation('reveal', 'open');
      $('#secondary-page-zone').load(this.href + ' #wrapper');
      event.preventDefault ? event.preventDefault() : event.returnValue = false;
      return false;
    })
  });

  // CONCOURS
  // $(document).ready(function() {
  //   if ( $( "body:not(.screamshot)" ).length ) {
  //     var now = new Date();
  //     var start_day = new Date(2013, 8, 30, 10, 30);
  //     if(now > start_day) {
  //       $("#concours").show();
  //       $("#link-concours").show();
  //       $("body").click(function() {
  //         $("#concours").remove();
  //       })
  //     } else {
  //       $("#concours").remove();
  //       $("#link-concours").remove();
  //     }
  //   } else {
  //     $("#concours").remove();
  //     $("#link-concours").remove();
  //   }
  // });

}
