/**
 * OpenStack client in Javascript.
 * mds900 20150703
 */

if (typeof(osclient) === "undefined") {
	osclient = {};
}

/**
 * Abstract base class client for generic OpenStack HTTP APIs.
 */
osclient.Client = function() {
};
$.extend(osclient.Client.prototype, {
	defaultParams: {
		error: function(jqxhr, status, err) {
			console.log(jqxhr, status, err);
		},
		contentType: "application/json",
		dataType: "json",
		method: "GET",
		type: "GET"
	},
	doRequest: function(extraParams) {
		if ("method" in extraParams && !("type" in extraParams)) {
			extraParams.type = extraParams.method;
		}
		if ("type" in extraParams && !("method" in extraParams)) {
			extraParams.method = extraParams.type;
		}
		return $.ajax($.extend({}, this.defaultParams, extraParams));
	}
});
