goog.module('omid.validationVerificationScript.ValidationVerificationClient');
const {packageExport} = goog.require('omid.common.exporter');
const {AdEventType} = goog.require('omid.common.constants');
const VerificationClient = goog.require('omid.verificationClient.VerificationClient');
const {resolveGlobalContext} = goog.require('omid.common.windowUtils');

let supplyParter;
let txn_state;
let bundle;
let auid;
let trax_id;
let imp = false;
/**
 * OMID ValidationVerificationClient.
 * Simple validation script example.
 * The script creates VerificationClient instance and register to the OMID events.
 * The script fires logs for every event that is received by the OMID.
 */
class ValidationVerificationClient {
    /**
     * Simple ValidationVerificationClient
     *  - log if support is true
     *  - register to sessionObserver
     *  - register a callback to all AdEventType, except additional registration to media events
     * @param {VerificationClient} verificationClient instance for communication with OMID server
     * @param {string} vendorKey - should be the same when calling sessionStart in order to get verificationParameters
     */
    constructor(verificationClient, vendorKey) {
        /** @private {VerificationClient} */
        this.verificationClient_ = verificationClient;
        const isSupported = this.verificationClient_.isSupported();
        this.getData();

        // if imp exists we will fire impression on geoChange unless OMID ends up being not supported
        // in which case we fire it immediately
        if (imp) {
            if (isSupported) {
                let onScreenGeometry = false;
                this.verificationClient_.addEventListener(AdEventType.GEOMETRY_CHANGE, (event) => {
                    if (!onScreenGeometry && event.data && event.data.adView && event.data.adView.onScreenGeometry &&
                        event.data.adView.onScreenGeometry.height > 0 && event.data.adView.onScreenGeometry.width > 0) {
                        this.sendImpression_(imp);
                        onScreenGeometry = true;
                    }
                });
            } else {
                this.sendImpression_(imp);
            }
        // if we are not firing an impression we enable testing mode where we emit events to collect
        // data on possible impression counting options
        } else {
            if (isSupported) {
                this.sendBeacon_("omid_loaded");
                this.verificationClient_.addEventListener(AdEventType.IMPRESSION, (event) => {
                    this.sendBeacon_("omid_imp");
                });
                let pixelInView = false;
                let onScreenGeometry = false;
                this.verificationClient_.addEventListener(AdEventType.GEOMETRY_CHANGE, (event) => {
                    if (!pixelInView && event.data && event.data.adView && event.data.adView.pixelsInView) {
                        this.sendBeacon_("omid_pixel");
                        pixelInView = true;
                    }
                    if (!onScreenGeometry && event.data && event.data.adView && event.data.adView.onScreenGeometry &&
                        event.data.adView.onScreenGeometry.height > 0 && event.data.adView.onScreenGeometry.width > 0) {
                        this.sendBeacon_("omid_geo");
                        onScreenGeometry = true;
                    }
                });
            } else {
                this.sendBeacon_("omid_no");
            }
    }
    }

    getData() {
        const global = resolveGlobalContext();
        if (global && global.document && global.document.currentScript && global.document.currentScript.getAttribute('data-ox-sp')) {
            supplyParter = global.document.currentScript.getAttribute('data-ox-sp');
            txn_state = global.document.currentScript.getAttribute('data-ox-txn-state');
            trax_id = global.document.currentScript.getAttribute('data-ox-trax-id');
            bundle = global.document.currentScript.getAttribute('data-ox-bundle');
            auid = global.document.currentScript.getAttribute('data-ox-auid');
            imp = global.document.currentScript.getAttribute('data-ox-imp');
        }
    }

    sendBeacon_(type) {
        fetch("https://privacysandbox-reporting.openx.net/ct?sp="+supplyParter+"&type="+type+"&bundle="+encodeURIComponent(bundle)+"&auid="+auid+"&trax_id="+trax_id+"&txn_state="+txn_state, {method: "POST", mode: "no-cors"})
    }

    sendImpression_(url) {
        fetch(url, {method: "GET", mode: "no-cors"})
    }
}
exports = ValidationVerificationClient;
