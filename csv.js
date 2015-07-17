(function($) {
	$.fn.toCSV = function() {
		var csv = '';
		this.each(function() {
			$(this).find("tr").each(function() {
				var headerCells = $(this).find("th"), dataCells = $(this).find("td");
				if (headerCells.length) {
					csv += headerCells.map(function() {
						return $.fn.toCSV.escapeCSV($(this).text(), false);
					}).get().join(',') + "\n";
				}
				if (dataCells.length) {
					csv += $(this).find("td").map(function() {
						return $.fn.toCSV.escapeCSV($(this).text(), true);
					}).get().join(',') + "\n";
				}
			});
		});
		return csv;
	};
	$.fn.toCSV.looksNumeric = function(value) {
		return value.match(/^-?\d+(\.\d*)?$/);
	};
	$.fn.toCSV.escapeCSV = function(value, convertNumeric) {
		if (convertNumeric && $.fn.toCSV.looksNumeric(value)) {
			return '' + parseFloat(value);
		} else {
			return '"' + value.replace(/"/g, '""') + '"';
		}
	};
	$.fn.toCSV.makeDownloadLink = function(link, table, filename) {
		link.data({ table: table, filename: filename });
		link.attr("href", "data:");
		link.on("click", function() {
			link.attr({
				href: 'data:text/csv;charset=UTF-8,' + encodeURIComponent(link.data("table").toCSV()),
				download: link.data("filename") + '.csv'
			});
			
		});
	};
})(jQuery);
