/**
 * OpenStack client in Javascript.
 * mds900 20150703
 */

function populateTenants(tenants) {
	var target = $("#tenantSelect").empty();
	$(tenants.tenants).each(function(i, tenant) {
		target.append(
			$("<option>")
			.attr({ label: tenant.name, value: tenant.id })
			.text(tenant.description ? (tenant.description + " (" + tenant.name + ")") : tenant.name)
		);
	});
}

function populateCatalog(catalog) {
	$(catalog).each(function(i, service) {
		$(service.endpoints).each(function(j, endpoint) {
			var prop;
			for (prop in endpoint) {
				service[prop] = endpoint[prop];
			}
		});
	});
	$("#catalog table").DataTable().clear().rows.add(catalog).draw();
}

function populateInstances(instances) {
	$("#instances table").DataTable().clear().rows.add(instances.servers).draw();
}

var keystone, nova;

function onAuthenticated() {
	populateCatalog(keystone.getCatalog());
	// Use the catalog to connect to Nova
	nova = new osclient.Nova({
		publicURL: keystone.getEndpoint({
			serviceType: "compute",
			endpointType: "public"
		}),
		token: keystone.getToken()
	});
	// Use Nova to retrieve a list of instances
	nova.getInstances({}, function(instances) {
		populateInstances(instances);
	});
};

function selectTenant(newTenantID) {
	var params = {
		authURL: $("#keystoneBaseURL").val(),
		username: $("#username").val(),
		password: $("#password").val()
	};
	if (newTenantID) {
		params.tenantID = newTenantID;
	}
	keystone = new osclient.Keystone(params);
	keystone.authenticate(onAuthenticated);
};

(function($) {
	$(function() {
		var tenantSelect = $("#tenantSelect");
		$("button, input[type=button], input[type=checkbox]").button();
		$('input[type=text]').addClass("ui-widget ui-widget-content ui-corner-all");
		$('select').menu();
		$('textfield.numeric, input.numeric').spinner();
		$("#catalog table").DataTable({
			columns: [
				{ "data": "type", title: "Type" },
				{ "data": "name", title: "Name" },
				{ "data": "publicURL", title: "Public URL" },
				{ "data": "adminURL", title: "Admin URL" },
				{ "data": "internalURL", title: "Internal URL" },
			]
		});
		$("#instances table").DataTable({
			columns: [
				{ "data": "name", title: "Name" },
				{ "data": "id", title: "UUID" }
			]
		});
		tenantSelect.on("change", function() {
			selectTenant(tenantSelect.val());
		});
		$("#goButton").on("click", function() {
			keystone = new osclient.Keystone({
				authURL: $("#keystoneBaseURL").val(),
				username: $("#username").val(),
				password: $("#password").val()
			});
			// Authenticate without a tenant, to obtain a token but no valid service catalog
			keystone.authenticate(function() {
				// Use the token to obtain a list of accessible tenants
				keystone.getTenants(function(tenants) {
					populateTenants(tenants);
					// Choose the first tenant listed
					var defaultTenant = tenants.tenants[0].id;
					// Authenticate again, this time with a tenant ID, to obtain the service catalog
					keystone = new osclient.Keystone({
						authURL: $("#keystoneBaseURL").val(),
						tenantID: defaultTenant,
						username: $("#username").val(),
						password: $("#password").val()
					});
					keystone.authenticate(onAuthenticated);
				});
			});
			return false;
		});
	});
})(jQuery);
