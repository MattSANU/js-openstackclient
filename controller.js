/**
 * OpenStack client in Javascript.
 * mds900 20150703
 */

// TODO: Restrict the scope of this
"use strict";

var keystone, nova;

function populateTenants(response) {
	var target = $("#tenantSelect").empty();
	$(response.tenants).each(function(i, tenant) {
		target.append(
			$("<option>")
			.attr({ label: tenant.name, value: tenant.id })
			.text(tenant.description ? (tenant.description + " (" + tenant.name + ")") : tenant.name)
		);
	});
}

function populateCatalog(catalog) {
	$("#catalog table").DataTable().clear().rows.add(catalog).draw();
}

function populateInstances(response) {
	$(response.servers).each(function(i, instance) {
		var addresses = [];
		$.each(instance.addresses, function(j, network) {
			$(network).each(function(k, port) {
				addresses.push(port.addr);
			});
		});
		instance.addressList = addresses.join(", ");
	});
	$("#instances table").DataTable().clear().rows.add(response.servers).draw();
}

function populateHypervisors(response) {
	$("#hypervisors table").DataTable().clear().rows.add(response.hypervisors).draw();
}

function onAuthenticated(catalog) {
	var url = keystone.getEndpoint({ serviceType: "identity", endpointType: "public" });
	populateCatalog(catalog);
	// Use the catalog to connect to Nova
	nova = new osclient.Nova({
		publicURL: keystone.getEndpoint({
			serviceType: "compute",
			endpointType: "public"
		}),
		token: keystone.getToken()
	});
	keystone.getTenants(populateTenants, false);
	// Use Nova to retrieve a list of instances
	nova.getAllInstancesDetailed({}, populateInstances);
	// Use Nova to retrieve a list of hypervisors
	nova.getHypervisorsDetailed(populateHypervisors);
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
				{ "data": "name", title: "Name" }
			]
		});
		$("#instances table").DataTable({
			columns: [
				{ "data": "name", title: "Name" },
				{ "data": "status", title: "Status" },
				{ "data": "addressList", title: "IP Addresses" },
				{ "data": "user_id", title: "User ID" },
				{ "data": "tenant_id", title: "Tenant ID" }
				// { "data": , title: "" },
			]
		});
		$("#hypervisors table").DataTable({
			columns: [
				{ "data": "current_workload", title: "Workload" },
				{ "data": "disk_available_least", title: "Least Available Disk" },
				{ "data": "free_disk_gb", title: "Free Disk" },
				{ "data": "free_ram_mb", title: "Free RAM" },
				{ "data": "host_ip", title: "IP" },
				{ "data": "hypervisor_hostname", title: "Hostname" },
				{ "data": "hypervisor_type", title: "Type" },
				{ "data": "hypervisor_version", title: "Version" },
				{ "data": "id", title: "ID" },
				{ "data": "local_gb", title: "Local GB" },
				{ "data": "local_gb_used", title: "Local GB Used" },
				{ "data": "memory_mb", title: "Memory" },
				{ "data": "memory_mb_used", title: "Memory Used" },
				{ "data": "running_vms", title: "Running VMs" },
				{ "data": "vcpus", title: "VCPUs" },
				{ "data": "vcpus_used", title: "VCPUs Used" }
			]
		});
		tenantSelect.on("change", function() {
			keystone.setTenantID(tenantSelect.val());
		});
		$("#goButton").on("click", function() {
			keystone = new osclient.Keystone({
				authURL: $("#keystoneBaseURL").val(),
				domainName: 'default',
				username: $("#username").val(),
				password: $("#password").val()
			});
			keystone.retrieveCatalog(onAuthenticated);
			return false;
		});
	});
})(jQuery);
