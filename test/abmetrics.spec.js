const expect = require('chai').expect;
const ABMetrics = require('..').ABMetrics;
const formatterTable = require('..').formatterTable;

describe('Given an A/B testing suite', () => {
	it('should add the expected number of values for both a/b metrics', () => {
		const aName = 'old';
		const bName = 'new';
		const abTracker = new ABMetrics(aName, bName);
		let errorHandlerCalled = false;
		abTracker.on('error', (_) => {
			errorHandlerCalled = true;
		});
		const firstMetric = 'metricA';
		const secondMetric = 'metricB';
		abTracker.accumulate(firstMetric, 1, 2);
		expect(abTracker.getTrackedMetrics().length, 'expected to track only one key').to.eq(1);
		expect(abTracker.getTrackedMetrics()[0], `Metric key should be ${firstMetric}`).to.eq(firstMetric);
		abTracker.accumulate(secondMetric, 3, 4);
		expect(abTracker.getTrackedMetrics().length, 'Expected two keys to be tracked').to.eq(2);
		abTracker.accumulate(firstMetric, 5, 6);
		abTracker.accumulate(secondMetric, 7, 8);
		expect(abTracker.getTrackedMetrics().length, 'Expected two keys to be tracked').to.eq(2);

		const items = abTracker.getValuesForMetric(firstMetric);
		expect(Object.keys(items).length, `${firstMetric} should contain two items (A/B)`).to.eq(2);
		expect(Array.isArray(items[aName]), `Values for metric ${firstMetric} should be an array for ${aName}`).to.eq(true);
		expect(Array.isArray(items[bName]), `Values for metric ${firstMetric} should be an array for ${bName}`).to.eq(true);
		expect(items[aName].length, `Metris for ${aName} should contain two samples`).to.eq(2);
		expect(items[bName].length, `Metris for ${bName} should contain two samples`).to.eq(2);
		expect(items[aName][0], `First element of ${aName} for metric ${firstMetric} should equal 1`).to.eq(1);
		expect(items[aName][1], `Second element of ${aName} for metric ${firstMetric} should equal 5`).to.eq(5);
		expect(items[bName][0], `First element of ${bName} for metric ${firstMetric} should equal 2`).to.eq(2);
		expect(items[bName][1], `Second element of ${bName} for metric ${firstMetric} should equal 5`).to.eq(6);

		const items2 = abTracker.getValuesForMetric(secondMetric);
		expect(Object.keys(items2).length, `${secondMetric} should contain two items (A/B)`).to.eq(2);
		expect(Array.isArray(items2[aName]), `Values for metric ${secondMetric} should be an array for ${aName}`).to.eq(true);
		expect(Array.isArray(items2[bName]), `Values for metric ${secondMetric} should be an array for ${bName}`).to.eq(true);
		expect(items2[aName].length, `Metris for ${aName} should contain two samples`).to.eq(2);
		expect(items2[bName].length, `Metris for ${bName} should contain two samples`).to.eq(2);
		expect(items2[aName][0], `First element of ${aName} for metric ${secondMetric} should equal 1`).to.eq(3);
		expect(items2[aName][1], `Second element of ${aName} for metric ${secondMetric} should equal 5`).to.eq(7);
		expect(items2[bName][0], `First element of ${bName} for metric ${secondMetric} should equal 2`).to.eq(4);
		expect(items2[bName][1], `Second element of ${bName} for metric ${secondMetric} should equal 5`).to.eq(8);
		expect(errorHandlerCalled, 'It should not emit any error').to.eq(false);
	});

	it('should not add empty metrics', () => {
		const abTracker = new ABMetrics('old', 'new');
		let errorCounter = 0;
		abTracker.on('error', (_) => {
			errorCounter++;
		});
		const firstMetric = 'metricA';
		abTracker.accumulate(firstMetric, 1, 2);
		expect(abTracker.getTrackedMetrics().length, 'Expected one key to be tracked').to.eq(1);
		abTracker.accumulate('', 3, 4);
		expect(abTracker.getTrackedMetrics().length, 'Expected one key to be tracked').to.eq(1);
		abTracker.accumulate('xyz', 'not a number', 'not a number');
		expect(abTracker.getTrackedMetrics().length, 'Expected one key to be tracked').to.eq(1);
		expect(errorCounter).to.eq(4);
	});

	it('should return metrics stats', () => {
		const abTracker = new ABMetrics('old', 'new');
		let errorHandlerCalled = false;
		abTracker.on('error', (_) => {
			errorHandlerCalled = true;
		});
		const firstMetric = 'schedule response time';
		const secondMetric = 'channels response time';
		abTracker.accumulate(firstMetric, 100, 120);
		abTracker.accumulate(firstMetric, 125, 80);
		abTracker.accumulate(firstMetric, 126, 75);
		abTracker.accumulate(firstMetric, 124, 125);
		const stats1 = abTracker.getStatsForMetric(firstMetric);
		expect(stats1.old.sum, 'Sum should match').to.eq(475);
		expect(stats1.new.sum, 'Sum should match').to.eq(400);
		expect(stats1.new.avg, 'Avg should match').to.eq(100);
		expect(stats1.new.count, 'Count should match').to.eq(4);
		expect(stats1.new.min, 'Min should match').to.eq(75);
		expect(stats1.new.max, 'Max should match').to.eq(125);

		abTracker.accumulate(secondMetric, 50, 0);
		const stats2 = abTracker.getStatsForMetric(secondMetric);
		expect(stats2.old.sum, 'Sum should match').to.eq(50);
		expect(stats2.new.sum, 'Sum should match').to.eq(0);
		expect(stats2.old.avg, 'Avg should match').to.eq(50);
		expect(stats2.new.avg, 'Avg should match').to.eq(0);
		expect(stats2.new.count, 'Count should match').to.eq(1);
		expect(stats2.new.min, 'Min should match').to.eq(0);
		expect(stats2.new.max, 'Max should match').to.eq(0);
		expect(errorHandlerCalled).to.eq(false);

		console.log(abTracker.formatResultsWith(formatterTable()));
	});
});
