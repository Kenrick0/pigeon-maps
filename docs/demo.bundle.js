webpackJsonp([0],{0:function(e,t,o){e.exports=o(1)},1:function(e,t,o){"use strict";function n(e){return e&&e.__esModule?e:{default:e}}var r=o(2),a=n(r),i=o(166),l=n(i),s=o(167),u=n(s);o(176),a.default.render(l.default.createElement(u.default,null),document.getElementById("root"))},167:function(e,t,o){"use strict";function n(e){return e&&e.__esModule?e:{default:e}}function r(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function a(e,t){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!t||"object"!=typeof t&&"function"!=typeof t?e:t}function i(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)}Object.defineProperty(t,"__esModule",{value:!0});var l=function(){function e(e,t){for(var o=0;o<t.length;o++){var n=t[o];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}return function(t,o,n){return o&&e(t.prototype,o),n&&e(t,n),t}}(),s=o(166),u=n(s),c=o(168),p=n(c),h=o(171),f=n(h),d="pk.eyJ1IjoicGlnZW9uLW1hcHMiLCJhIjoiY2l3eW01Y2E2MDA4dzJ6cWh5dG9pYWlwdiJ9.cvdCf-7PymM1Y3xp5j71NQ",m=function(e,t){return function(o,n,r){var a="undefined"!=typeof window&&window.devicePixelRatio>=2?"@2x":"";return"https://api.mapbox.com/styles/v1/mapbox/"+e+"/tiles/256/"+r+"/"+o+"/"+n+a+"?access_token="+t}},v={osm:function(e,t,o){var n=String.fromCharCode(97+(e+t+o)%3);return"https://"+n+".tile.openstreetmap.org/"+o+"/"+e+"/"+t+".png"},wikimedia:function(e,t,o){var n="undefined"!=typeof window&&window.devicePixelRatio>=2?"@2x":"";return"https://maps.wikimedia.org/osm-intl/"+o+"/"+e+"/"+t+n+".png"},streets:m("streets-v10",d),satellite:m("satellite-streets-v10",d),outdoors:m("outdoors-v10",d),light:m("light-v9",d),dark:m("dark-v9",d)},g=function(e){function t(e){r(this,t);var o=a(this,(t.__proto__||Object.getPrototypeOf(t)).call(this,e));return o.zoomIn=function(){o.setState({zoom:Math.min(o.state.zoom+1,18)})},o.zoomOut=function(){o.setState({zoom:Math.max(o.state.zoom-1,1)})},o.handleBoundsChange=function(e){var t=e.center,n=e.zoom;e.bounds;o.setState({center:t,zoom:n})},o.handleClick=function(e){var t=(e.event,e.latLng),o=e.pixel;console.log("Map clicked!",t,o)},o.handleMarkerClick=function(e){var t=(e.event,e.payload),o=e.anchor;console.log("Marker #"+t+" clicked at: ",o)},o.state={center:[50.879,4.6997],zoom:13,provider:"outdoors"},o}return i(t,e),l(t,[{key:"render",value:function(){var e=this,t=this.state,o=t.center,n=t.zoom,r=t.provider;return u.default.createElement("div",null,u.default.createElement(p.default,{center:o,zoom:n,provider:v[r],onBoundsChanged:this.handleBoundsChange,onClick:this.handleClick,width:600,height:400},u.default.createElement(f.default,{anchor:[50.879,4.6997],payload:1,onClick:this.handleMarkerClick}),u.default.createElement(f.default,{anchor:[50.874,4.6947],payload:2,onClick:this.handleMarkerClick})),u.default.createElement("div",null,u.default.createElement("button",{onClick:this.zoomOut},"Zoom Out"),u.default.createElement("button",{onClick:this.zoomIn},"Zoom In")," ",n),u.default.createElement("div",{style:{marginTop:20}},Object.keys(v).map(function(t){return u.default.createElement("button",{key:t,onClick:function(){return e.setState({provider:t})},style:{fontWeight:r===t?"bold":"normal"}},t)})))}}]),t}(s.Component);t.default=g},168:function(e,t,o){"use strict";function n(e){return e&&e.__esModule?e:{default:e}}function r(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function a(e,t){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!t||"object"!=typeof t&&"function"!=typeof t?e:t}function i(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)}function l(e,t,o){var n="undefined"!=typeof window&&window.devicePixelRatio>=2;return"https://maps.wikimedia.org/osm-intl/"+o+"/"+e+"/"+t+(n?"@2x":"")+".png"}function s(e,t){return e/Math.pow(2,t)*360-180}function u(e,t){var o=Math.PI-2*Math.PI*e/Math.pow(2,t);return 180/Math.PI*Math.atan(.5*(Math.exp(o)-Math.exp(-o)))}function c(e,t){var o=(0,v.default)(e);return[t.clientX-o.x,t.clientY-o.y]}function p(e){return e*(2-e)}Object.defineProperty(t,"__esModule",{value:!0});var h=function(){function e(e,t){for(var o=0;o<t.length;o++){var n=t[o];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}return function(t,o,n){return o&&e(t.prototype,o),n&&e(t,n),t}}(),f=o(166),d=n(f),m=o(169),v=n(m),g=o(170),M=n(g),_=300,w=1500,y=150,b=40,T=2,x=300,C=function(e,t){return(e+180)/360*Math.pow(2,t)},k=function(e,t){return(1-Math.log(Math.tan(e*Math.PI/180)+1/Math.cos(e*Math.PI/180))/Math.PI)/2*Math.pow(2,t)},P=s(0,10),z=u(Math.pow(2,10),10),S=s(Math.pow(2,10),10),E=u(0,10),O=function(e){function t(e){r(this,t);var o=a(this,(t.__proto__||Object.getPrototypeOf(t)).call(this,e));return o.setCenterZoomTarget=function(e,t,n){var r=arguments.length>3&&void 0!==arguments[3]?arguments[3]:null,a=arguments.length>4&&void 0!==arguments[4]?arguments[4]:_;if(o.props.animate){if(o._isAnimating){window.cancelAnimationFrame(o._animFrame);var i=o.animationStep(window.performance.now()),l=i.centerStep,s=i.zoomStep;o._centerStart=l,o._zoomStart=s}else o._isAnimating=!0,o._centerStart=o.limitCenterAtZoom([o.state.center[0],o.state.center[1]],o.state.zoom),o._zoomStart=o.state.zoom;o._animationStart=window.performance.now(),o._animationEnd=o._animationStart+a,r?(o._zoomAround=r,o._centerTarget=o.calculateZoomCenter(o.state.center,r,o.state.zoom,t)):(o._zoomAround=null,o._centerTarget=e),o._zoomTarget=t,o._animFrame=window.requestAnimationFrame(o.animate)}else if(r){var u=o.calculateZoomCenter(o.state.center,r,o.state.zoom,t);o.setCenterZoom(u,t,n)}else o.setCenterZoom(e,t,n)},o.animationStep=function(e){var t=o._animationEnd-o._animationStart,n=Math.max(e-o._animationStart,0),r=p(n/t),a=(o._zoomTarget-o._zoomStart)*r,i=o._zoomStart+a;if(o._zoomAround){var l=o.calculateZoomCenter(o._centerStart,o._zoomAround,o._zoomStart,i);return{centerStep:l,zoomStep:i}}var s=[o._centerStart[0]+(o._centerTarget[0]-o._centerStart[0])*r,o._centerStart[1]+(o._centerTarget[1]-o._centerStart[1])*r];return{centerStep:s,zoomStep:i}},o.animate=function(e){if(e>=o._animationEnd)o._isAnimating=!1,o.setCenterZoom(o._centerTarget,o._zoomTarget);else{var t=o.animationStep(e),n=t.centerStep,r=t.zoomStep;o.setCenterZoom(n,r),o._animFrame=window.requestAnimationFrame(o.animate)}},o.stopAnimating=function(){o._isAnimating&&(o._isAnimating=!1,window.cancelAnimationFrame(o._animFrame))},o.limitCenterAtZoom=function(e,t){return[Math.max(Math.min(isNaN(e[0])?o.state.center[0]:e[0],E),z),Math.max(Math.min(isNaN(e[1])?o.state.center[1]:e[1],S),P)]},o.setCenterZoom=function(e,t){var n=o.limitCenterAtZoom(e,t);Math.round(o.state.zoom)!==Math.round(t)&&!function(){var e=o.tileValues(o.props,o.state),r=o.tileValues(o.props,{center:n,zoom:t}),a=o.state.oldTiles;o.setState({oldTiles:a.filter(function(t){return t.roundedZoom!==e.roundedZoom}).concat(e)});for(var i={},l=r.tileMinX;l<=r.tileMaxX;l++)for(var s=r.tileMinY;s<=r.tileMaxY;s++){var u=l+"-"+s+"-"+r.roundedZoom;i[u]=!1}o._loadTracker=i}(),o.setState({center:n,zoom:t}),(Math.abs(o.props.zoom-t)>.001||Math.abs(o.props.center[0]-n[0])>1e-4||Math.abs(o.props.center[1]-n[1])>1e-4)&&o.syncToProps(n,t)},o.imageLoaded=function(e){if(o._loadTracker&&e in o._loadTracker){o._loadTracker[e]=!0;var t=Object.keys(o._loadTracker).filter(function(e){return!o._loadTracker[e]}).length;0===t&&o.setState({oldTiles:[]})}},o.handleTouchStart=function(e){var t=o.props,n=t.width,r=t.height;if(1===e.touches.length){var a=e.touches[0],i=c(o._containerRef,a);if(i[0]>=0&&i[1]>=0&&i[0]<n&&i[1]<r)if(o._touchStartCoords=[[a.clientX,a.clientY]],o.stopAnimating(),e.preventDefault(),o._lastTap&&window.performance.now()-o._lastTap<x){var l=o.pixelToLatLng(o._touchStartCoords[0]);o.setCenterZoomTarget(null,Math.max(1,Math.min(o.state.zoom+1,18)),!1,l)}else o._lastTap=window.performance.now(),o.startTrackingMoveEvents(i)}else if(2===e.touches.length&&o._touchStartCoords){e.preventDefault(),o.stopTrackingMoveEvents(),(o.state.pixelDelta||o.state.zoomDelta)&&o.sendDeltaChange();var s=e.touches[0],u=e.touches[1];o._touchStartCoords=[[s.clientX,s.clientY],[u.clientX,u.clientY]],o._touchStartMidPoint=[(s.clientX+u.clientX)/2,(s.clientY+u.clientY)/2],o._touchStartDistance=Math.sqrt(Math.pow(s.clientX-u.clientX,2)+Math.pow(s.clientY-u.clientY,2))}},o.handleTouchMove=function(e){if(1===e.touches.length&&o._touchStartCoords){e.preventDefault();var t=e.touches[0],n=c(o._containerRef,t);o.trackMoveEvents(n),o.setState({pixelDelta:[t.clientX-o._touchStartCoords[0][0],t.clientY-o._touchStartCoords[0][1]]})}else if(2===e.touches.length&&o._touchStartCoords){var r=o.props,a=r.width,i=r.height,l=o.state.zoom;e.preventDefault();var s=e.touches[0],u=e.touches[1],p=(0,v.default)(o._containerRef),h=[(s.clientX+u.clientX)/2,(s.clientY+u.clientY)/2],f=[h[0]-o._touchStartMidPoint[0],h[1]-o._touchStartMidPoint[1]],d=Math.sqrt(Math.pow(s.clientX-u.clientX,2)+Math.pow(s.clientY-u.clientY,2)),m=Math.min(18,l+Math.log2(d/o._touchStartDistance))-l,g=Math.pow(2,m),M=[(p.x+a/2-h[0])*(g-1),(p.y+i/2-h[1])*(g-1)];o.setState({zoomDelta:m,pixelDelta:[M[0]+f[0]*g,M[1]+f[1]*g]})}},o.handleTouchEnd=function(e){if(o._touchStartCoords){e.preventDefault();var t=o.sendDeltaChange(),n=t.center,r=t.zoom;if(0===e.touches.length){o._touchStartCoords=null;var a=c(o._containerRef,e.changedTouches[0]);o.throwAfterMoving(a,n,r)}else if(1===e.touches.length){var i=e.touches[0],l=c(o._containerRef,i);o._touchStartCoords=[[i.clientX,i.clientY]],o.startTrackingMoveEvents(l)}}},o.handleMouseDown=function(e){var t=o.props,n=t.width,r=t.height,a=c(o._containerRef,e);if(0===e.button&&!(0,M.default)(e.target,"pigeon-drag-block")&&a[0]>=0&&a[1]>=0&&a[0]<n&&a[1]<r)if(o.stopAnimating(),e.preventDefault(),o._lastClick&&window.performance.now()-o._lastClick<x){var i=o.pixelToLatLng(o._mousePosition);o.setCenterZoomTarget(null,Math.max(1,Math.min(o.state.zoom+1,18)),!1,i)}else o._lastClick=window.performance.now(),o._mouseDown=!0,o._dragStart=a,o.startTrackingMoveEvents(a)},o.handleMouseMove=function(e){o._mousePosition=c(o._containerRef,e),o._mouseDown&&o._dragStart&&(o.trackMoveEvents(o._mousePosition),o.setState({pixelDelta:[o._mousePosition[0]-o._dragStart[0],o._mousePosition[1]-o._dragStart[1]]}))},o.handleMouseUp=function(e){var t=o.state.pixelDelta;if(o._mouseDown){o._mouseDown=!1;var n=c(o._containerRef,e);if(o.props.onClick&&!(0,M.default)(e.target,"pigeon-click-block")&&(!t||Math.abs(t[0])+Math.abs(t[1])<=T)){var r=o.pixelToLatLng(n);o.props.onClick({event:e,latLng:r,pixel:n}),o.setState({pixelDelta:null})}else{var a=o.sendDeltaChange(),i=a.center,l=a.zoom;o.throwAfterMoving(n,i,l)}}},o.startTrackingMoveEvents=function(e){o._moveEvents=[{timestamp:window.performance.now(),coords:e}]},o.stopTrackingMoveEvents=function(){o._moveEvents=[]},o.trackMoveEvents=function(e){var t=window.performance.now();t-o._moveEvents[o._moveEvents.length-1].timestamp>40&&(o._moveEvents.push({timestamp:t,coords:e}),o._moveEvents.length>2&&o._moveEvents.shift())},o.throwAfterMoving=function(e,t,n){var r=o.props,a=r.width,i=r.height,l=r.animate,c=window.performance.now(),p=o._moveEvents.shift();if(p&&l){var h=Math.max(c-p.timestamp,1),f=[(e[0]-p.coords[0])/h*120,(e[1]-p.coords[1])/h*120],d=Math.sqrt(f[0]*f[0]+f[1]*f[1]);if(d>b){var m=Math.sqrt(a*a+i*i),v=w*d/m,g=s(C(t[1],n)-f[0]/256,n),M=u(k(t[0],n)-f[1]/256,n);o.setCenterZoomTarget([M,g],n,!1,null,v)}}o.stopTrackingMoveEvents()},o.sendDeltaChange=function(){var e=o.state,t=e.center,n=e.zoom,r=e.pixelDelta,a=e.zoomDelta,i=t[0],l=t[1];return(r||0!==a)&&(l=s(C(t[1],n+a)-(r?r[0]/256:0),n+a),i=u(k(t[0],n+a)-(r?r[1]/256:0),n+a),o.setCenterZoom([i,l],n+a)),o.setState({pixelDelta:null,zoomDelta:0}),{center:o.limitCenterAtZoom([i,l],n+a),zoom:n+a}},o.syncToProps=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:o.state.center,t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:o.state.zoom,n=o.props,r=n.onBoundsChanged,a=n.width,i=n.height;if(r){var l={ne:o.pixelToLatLng([a-1,0]),sw:o.pixelToLatLng([0,i-1])};r({center:e,zoom:t,bounds:l})}},o.handleWheel=function(e){e.preventDefault();var t=-e.deltaY/y;if(o._zoomTarget){var n=o._zoomTarget-o.state.zoom;o.zoomAroundMouse(t+n)}else o.zoomAroundMouse(t)},o.zoomAroundMouse=function(e){var t=o.state.zoom;if(!(!o._mousePosition||1===t&&e<0||18===t&&e>0)){var n=o.pixelToLatLng(o._mousePosition);o.setCenterZoomTarget(null,Math.max(1,Math.min(t+e,18)),!1,n)}},o.zoomPlusDelta=function(){return o.state.zoom+o.state.zoomDelta},o.pixelToLatLng=function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:o.state.center,n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:o.zoomPlusDelta(),r=o.props,a=r.width,i=r.height,l=o.state.pixelDelta,c=[(e[0]-a/2-(l?l[0]:0))/256,(e[1]-i/2-(l?l[1]:0))/256],p=C(t[1],n)+c[0],h=k(t[0],n)+c[1];return o.limitCenterAtZoom([u(h,n),s(p,n)],n)},o.latLngToPixel=function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:o.state.center,n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:o.zoomPlusDelta(),r=o.props,a=r.width,i=r.height,l=o.state.pixelDelta,s=o.limitCenterAtZoom(t),u=C(s[1],n),c=k(s[0],n),p=C(e[1],n),h=k(e[0],n);return[256*(p-u)+a/2+(l?l[0]:0),256*(h-c)+i/2+(l?l[1]:0)]},o.calculateZoomCenter=function(e,t,n,r){var a=o.latLngToPixel(t,e,n),i=o.pixelToLatLng(a,e,r),l=i[0]-t[0],s=i[1]-t[1];return o.limitCenterAtZoom([e[0]-l,e[1]-s],r)},o.setRef=function(e){o._containerRef=e},o._mousePosition=null,o._dragStart=null,o._mouseDown=!1,o._moveEvents=[],o._lastClick=null,o._lastTap=null,o._touchStartCoords=null,o._isAnimating=!1,o._animationStart=null,o._animationEnd=null,o._centerTarget=null,o._zoomTarget=null,o.state={zoom:e.zoom,center:e.center,zoomDelta:0,pixelDelta:null,oldTiles:[]},o}return i(t,e),h(t,[{key:"componentDidMount",value:function(){var e=window.addEventListener;e("mousedown",this.handleMouseDown),e("mouseup",this.handleMouseUp),e("mousemove",this.handleMouseMove),e("touchstart",this.handleTouchStart),e("touchmove",this.handleTouchMove),e("touchend",this.handleTouchEnd)}},{key:"componentWillUnmount",value:function(){var e=window.removeEventListener;e("mousedown",this.handleMouseDown),e("mouseup",this.handleMouseUp),e("mousemove",this.handleMouseMove),e("touchstart",this.handleTouchStart),e("touchmove",this.handleTouchMove),e("touchend",this.handleTouchEnd)}},{key:"componentWillReceiveProps",value:function(e){(Math.abs(e.zoom-this.state.zoom)>.001||Math.abs(e.center[0]-this.state.center[0])>1e-4||Math.abs(e.center[1]-this.state.center[1])>1e-4)&&this.setCenterZoomTarget(e.center,e.zoom,!0)}},{key:"tileValues",value:function(e,t){var o=e.width,n=e.height,r=t.center,a=t.zoom,i=t.pixelDelta,l=t.zoomDelta,s=Math.round(a+(l||0)),u=a+(l||0)-s,c=Math.pow(2,u),p=o/c,h=n/c,f=C(r[1],s)-(i?i[0]/256/c:0),d=k(r[0],s)-(i?i[1]/256/c:0),m=p/2/256,v=h/2/256,g=Math.floor(f-m),M=Math.floor(f+m),_=Math.floor(d-v),w=Math.floor(d+v);return{tileMinX:g,tileMaxX:M,tileMinY:_,tileMaxY:w,tileCenterX:f,tileCenterY:d,roundedZoom:s,zoomDelta:l||0,scaleWidth:p,scaleHeight:h,scale:c}}},{key:"renderTiles",value:function(){for(var e=this,t=this.state.oldTiles,o=this.props.provider||l,n=this.tileValues(this.props,this.state),r=n.tileMinX,a=n.tileMaxX,i=n.tileMinY,s=n.tileMaxY,u=n.tileCenterX,c=n.tileCenterY,p=n.roundedZoom,h=n.scaleWidth,f=n.scaleHeight,m=n.scale,v=[],g=0;g<t.length;g++){var M=t[g],_=M.roundedZoom-p;if(!(Math.abs(_)>4||0===_))for(var w=1/Math.pow(2,_),y=256*-(r-M.tileMinX*w),b=256*-(i-M.tileMinY*w),T=Math.max(M.tileMinX,0),x=Math.max(M.tileMinY,0),C=Math.min(M.tileMaxX,Math.pow(2,M.roundedZoom)-1),k=Math.min(M.tileMaxY,Math.pow(2,M.roundedZoom)-1),P=T;P<=C;P++)for(var z=x;z<=k;z++)v.push({key:P+"-"+z+"-"+M.roundedZoom,url:o(P,z,M.roundedZoom),left:y+256*(P-M.tileMinX)*w,top:b+256*(z-M.tileMinY)*w,width:256*w,height:256*w,active:!1})}for(var S=Math.max(r,0),E=Math.max(i,0),O=Math.min(a,Math.pow(2,p)-1),D=Math.min(s,Math.pow(2,p)-1),L=S;L<=O;L++)for(var Z=E;Z<=D;Z++)v.push({key:L+"-"+Z+"-"+p,url:o(L,Z,p),left:256*(L-r),top:256*(Z-i),width:256,height:256,active:!0});var A={width:h,height:f,position:"absolute",top:0,left:0,overflow:"hidden",transform:"scale("+m+", "+m+")",transformOrigin:"top left"},Y=-(256*(u-r)-h/2),j=-(256*(c-i)-f/2),X={position:"absolute",width:256*(a-r+1),height:256*(s-i+1),transform:"translate("+Y+"px, "+j+"px)"};return d.default.createElement("div",{style:A},d.default.createElement("div",{style:X},v.map(function(t){return d.default.createElement("img",{key:t.key,src:t.url,width:t.width,height:t.height,onLoad:function(){return e.imageLoaded(t.key)},style:{position:"absolute",left:t.left,top:t.top,transform:t.transform,transformOrigin:"top left",opacity:1}})})))}},{key:"renderOverlays",value:function(){var e=this,t=this.props,o=t.width,n=t.height,r=this.state.center,a=d.default.Children.map(this.props.children,function(t){var o=t.props,n=o.anchor,a=o.position,i=o.offset,l=e.latLngToPixel(n||a||r);return d.default.cloneElement(t,{left:l[0]-(i?i[0]:0),top:l[1]-(i?i[1]:0),latLngToPixel:e.latLngToPixel,pixelToLatLng:e.pixelToLatLng})}),i={position:"absolute",width:o,height:n,top:0,left:0};return d.default.createElement("div",{style:i},a)}},{key:"renderAttribution",value:function(){var e=this.props,t=e.attribution,o=e.attributionPrefix;if(t===!1)return null;var n={position:"absolute",bottom:0,right:0,fontSize:"11px",padding:"2px 5px",background:"rgba(255, 255, 255, 0.7)",fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif",color:"#333"},r={color:"#0078A8",textDecoration:"none"};return d.default.createElement("div",{key:"attr",className:"pigeon-attribution",style:n},o===!1?null:d.default.createElement("span",null,o||d.default.createElement("a",{href:"https://github.com/mariusandra/pigeon-maps",style:r},"Pigeon")," | "),t||d.default.createElement("span",null," © ",d.default.createElement("a",{href:"https://www.openstreetmap.org/copyright",style:r},"OpenStreetMap")," contributors"))}},{key:"render",value:function(){var e=this.props,t=e.width,o=e.height,n={width:t,height:o,position:"relative",display:"inline-block",overflow:"hidden",background:"#dddddd"};return d.default.createElement("div",{style:n,ref:this.setRef,onWheel:this.handleWheel},this.renderTiles(),this.renderOverlays(),this.renderAttribution())}}]),t}(f.Component);O.propTypes={center:d.default.PropTypes.array,zoom:d.default.PropTypes.number,width:d.default.PropTypes.number,height:d.default.PropTypes.number,provider:d.default.PropTypes.func,children:d.default.PropTypes.node,animate:d.default.PropTypes.bool,attribution:d.default.PropTypes.any,attributionPrefix:d.default.PropTypes.any,onClick:d.default.PropTypes.func,onBoundsChanged:d.default.PropTypes.func},O.defaultProps={animate:!0},t.default=O},169:function(e,t){"use strict";function o(e){for(var t=0,o=0,n=!0;e;)t+=e.offsetLeft-(n?0:e.scrollLeft)+e.clientLeft,o+=e.offsetTop-(n?0:e.scrollTop)+e.clientTop,e=e.offsetParent,n=!1;return{x:t,y:o}}Object.defineProperty(t,"__esModule",{value:!0}),t.default=o},170:function(e,t){"use strict";function o(e,t){for(;e;){if(e.classList.contains(t))return!0;e=e.offsetParent}return!1}Object.defineProperty(t,"__esModule",{value:!0}),t.default=o},171:function(e,t,o){"use strict";function n(e){return e&&e.__esModule?e:{default:e}}function r(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function a(e,t){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!t||"object"!=typeof t&&"function"!=typeof t?e:t}function i(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)}Object.defineProperty(t,"__esModule",{value:!0});var l=function(){function e(e,t){for(var o=0;o<t.length;o++){var n=t[o];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}return function(t,o,n){return o&&e(t.prototype,o),n&&e(t,n),t}}(),s=o(166),u=n(s),c=o(172),p=n(c),h=o(173),f=n(h),d=o(174),m=n(d),v=o(175),g=n(v),M={left:15,top:31},_=function(e){function t(e){r(this,t);var o=a(this,(t.__proto__||Object.getPrototypeOf(t)).call(this,e));return o.eventParameters=function(e){return{event:e,anchor:o.props.anchor,payload:o.props.payload}},o.handleClick=function(e){o.props.onClick&&o.props.onClick(o.eventParameters())},o.handleContextMenu=function(e){o.props.onContextMenu&&o.props.onContextMenu(o.eventParameters())},o.handleMouseOver=function(e){o.props.onMouseOver&&o.props.onMouseOver(o.eventParameters()),o.setState({hover:!0})},o.handleMouseOut=function(e){o.props.onMouseOut&&o.props.onMouseOut(o.eventParameters()),o.setState({hover:!1})},o.state={hover:!1},o}return i(t,e),l(t,[{key:"isRetina",value:function(){return"undefined"!=typeof window&&window.devicePixelRatio>=2}},{key:"isHover",value:function(){return"boolean"==typeof this.props.hover?this.props.hover:this.state.hover}},{key:"image",value:function(){return this.isRetina()?this.isHover()?g.default:f.default:this.isHover()?m.default:p.default}},{key:"componentDidMount",value:function(){var e=this.isRetina()?[f.default,g.default]:[p.default,m.default];e.forEach(function(e){var t=new window.Image;t.src=e})}},{key:"render",value:function(){var e=this.props,t=e.left,o=e.top,n=e.onClick,r={position:"absolute",transform:"translate("+(t-M.left)+"px, "+(o-M.top)+"px)",cursor:n?"pointer":"default"};return u.default.createElement("div",{style:r,className:"pigeon-click-block",onClick:this.handleClick,onContextMenu:this.handleContextMenu,onMouseOver:this.handleMouseOver,onMouseOut:this.handleMouseOut},u.default.createElement("img",{src:this.image(),width:29,height:34,alt:""}))}}]),t}(s.Component);_.propTypes={anchor:s.PropTypes.array.isRequired,payload:s.PropTypes.any,hover:s.PropTypes.bool,onClick:s.PropTypes.func,onContextMenu:s.PropTypes.func,onMouseOver:s.PropTypes.func,onMouseOut:s.PropTypes.func,left:s.PropTypes.number,top:s.PropTypes.number,latLngToPixel:s.PropTypes.func,pixelToLatLng:s.PropTypes.func},t.default=_},172:function(e,t,o){e.exports=o.p+"pin.png"},173:function(e,t,o){e.exports=o.p+"pin@2x.png"},174:function(e,t,o){e.exports=o.p+"pin-hover.png"},175:function(e,t,o){e.exports=o.p+"pin-hover@2x.png"},176:function(e,t,o){e.exports=o.p+"index.html"}});