const Events = require('events');

class MetricsSummary extends Events {
	constructor() {
		super();
		this.valuesMap = new Map();
	}
	
	accumulate(metricName, value) {
		if (metricName === '') {
			this.emit('error', 'Empty metric names are not allowed');
			return;
		}
		if (isNaN(value)) {
			this.emit('error', 'Only numeric values are allowed');
			return;
		}
		if (!this.valuesMap.has(metricName)) {
			this.valuesMap.set(metricName, []);
		}
		this.valuesMap.get(metricName).push(value);
	}
	
	hasMetric(metricName) {
		return this.valuesMap.has(metricName);
	}
	
	getTrackedMetrics() {
		const names = [];
		let done = false;
		const iterator = this.valuesMap.keys();
		while(!done) {
			const k = iterator.next().value;
			if (k !== undefined) {
				names.push(k);
			} else {
				done = true;
			}
		}
		return names;
	}
	
	getStatsForMetric(metricName) {
		if (typeof metricName !== 'string' || metricName === '') {
			this.emit('error', 'requesting invalid metric name');
			return null;
		}
		if (!this.valuesMap.has(metricName)) {
			this.emit('error', `there is no record for metric name ${metricName}`);
			return null;
		}
	
		const values = this.valuesMap.get(metricName);
		const response = { sum: 0, count: values.length, min: 0, max: 0, avg: 0, std: 0 };
		if (response.count === 0) {
			return response;
		}
		response.min = values[0];
		response.max = values[0];
		for(const v of values) {
			response.sum+=v;
			if (v > response.max) {
				response.max = v;
			}
			if (v < response.min) {
				response.min = v;
			}
		}
		let xsum = 0;
		for(const v of values) {
			xsum+= Math.pow(v - response.avg, 2);
		}
		response.std = Math.sqrt(xsum / response.count);
		response.avg = response.sum / response.count;
		return response;
	}
	
	getAllStats() {
		const metricNames = this.getTrackedMetrics();
		const summary = {};
		for(const metricName of metricNames) {
			summary[metricName] = this.getStatsForMetric(metricName);
		}
		return summary;
	}
	
	getValuesForMetric(metricName) {
		return this.valuesMap.get(metricName);
	}
	
 }
	
 class ABMetrics extends Events {
	constructor(aName = 'A', bName = 'B') {
		super();
		this.maxLabelLength = 0;
		this.names = { a: aName, b: bName };
		this.metricsA = new MetricsSummary();
		this.metricsB = new MetricsSummary();
		this.metricsA.on('error', (e) => {
			this.emit('error', { instance: this.names.a, error: e });
		});
		this.metricsB.on('error', (e) => {
			this.emit('error', { instance: this.names.b, error: e });
		});
		this.title = `${new Date()} A/B comparison report: ${aName} vs ${bName}`;
	}
	
	getTitle() {
		return this.title;
	}
	
	accumulate(metricName, aValue, bValue) {
		if (metricName.length > this.maxLabelLength) {
			this.maxLabelLength = metricName.length;
		}
		this.metricsA.accumulate(metricName, aValue);
		this.metricsB.accumulate(metricName, bValue);
	}
	
	getTrackedMetrics() {
		return this.metricsA.getTrackedMetrics();
	}
	
	getStatsForMetric(metricName) {
		return {
			[this.names.a]: this.metricsA.getStatsForMetric(metricName),
			[this.names.b]: this.metricsB.getStatsForMetric(metricName),
		}
	}
	
	getValuesForMetric(metricName) {
		if (!this.metricsA.hasMetric(metricName)) {
			return null;
		}
		return {
			[this.names.a]: this.metricsA.getValuesForMetric(metricName),
			[this.names.b]: this.metricsB.getValuesForMetric(metricName)
		}
	}
	
	getAllStats() {
		return {
			[this.names.a]: this.metricsA.getAllStats(),
			[this.names.b]: this.metricsB.getAllStats()
		}
	}

	/**
	 * Shapes report to ease printing results
	 * @param {*} formatter 
	 */
	formatResultsWith(formatter) {
		if (typeof formatter !== 'function') { // a formatter function has to be provided
			return '';
		}
		const metrics = this.getTrackedMetrics();
		const report = {
			labels: [this.names.a, this.names.b],
			results: {},
			maxLabelSize: this.maxLabelLength,
			metrics,
		}
		for(const metric of metrics) {
			report.results[metric] = this.getStatsForMetric(metric);
		}
		return formatter(report);
	}
 }

 function formatterTable() {

	return function(results) {
		const numberWidth = 12;	
		function fmt(n, usingDigits = 2) {
			const numberFormat = { minimumFractionDigits: usingDigits,
				maximumFractionDigits: usingDigits };
			return n.toLocaleString(undefined, numberFormat).padStart(numberWidth);
		}
		const labelPad = results.maxLabelSize;
		const headers = ['METRIC', 'COUNT', 'AVG', 'MIN', 'MAX', 'STD'];
		let str = `| ${headers[0].padStart(labelPad)} | ${headers[1].padStart(numberWidth)} | ${headers[2].padStart(numberWidth)} | ${headers[3].padStart(numberWidth)} | ${headers[4].padStart(numberWidth)} | ${headers[5].padStart(numberWidth)} |`;
		const a = results.labels[0];
		const b = results.labels[1];
		for (const metric of results.metrics) {
			const metA = results.results[metric][a];
			const metB = results.results[metric][b];
			str+=`\n| ${metric.padStart(labelPad)} | ${''.padStart(numberWidth)} | ${''.padStart(numberWidth)} | ${''.padStart(numberWidth)} | ${''.padStart(numberWidth)} | ${''.padStart(numberWidth)} |
| ${a.padStart(labelPad)} | ${fmt(metA.count, 0)} | ${fmt(metA.avg)} | ${fmt(metA.min)} | ${fmt(metA.max)} | ${fmt(metA.std)} |
| ${b.padStart(labelPad)} | ${fmt(metB.count, 0)} | ${fmt(metB.avg)} | ${fmt(metB.min)} | ${fmt(metB.max)} | ${fmt(metB.std)} |
| ${''.padStart(labelPad)} | ${''.padStart(numberWidth)} | ${''.padStart(numberWidth)} | ${''.padStart(numberWidth)} | ${''.padStart(numberWidth)} | ${''.padStart(numberWidth)} |`;
		}
		return str;
	}
 }
	
 module.exports = {
	MetricsSummary,
	ABMetrics,
	formatterTable,
 } 