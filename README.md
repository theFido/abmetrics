# AB Metrics recorder

During an A/B testing session, keep track of the metrics and summarize them at 
the end.

Usage:
```js
const { ABMetrics } = require('abmetrics');

// comparing two instances: old, new
const tracker = new ABMetrics('old', 'new');

// assuming metrics is an array of response times for API example1
// from two versions 1 and 2 where each entry has the form { a: 123, b: 234 }
for (const metric of metrics) {
	tracker.accumulate('API 1 response time', metric.a, metric.b);
}

// assuming metrics2 is a second array for API 2 response time
for (const metric of metrics2) {
	tracker.accumulate('API 2 response time', metric.a, metric.b);
}

console.log(tracker.getStatsForMetric('API 1 response time'));

{
	"old": {
		"sum": 475,
		"count": 4,
		"min": 100,
		"max": 126,
		"avg": 118.75,
		"std": 0
	},
	"new": {
		"sum": 400,
		"count": 4,
		"min": 75,
		"max": 125,
		"avg": 100,
		"std": 0
	}
}
```


## Formatting results

You can use formatter function to pretty print results, this just provides a single
option called `formatterTable` that can be used like the example below.

```js
const { formatterTable } = require('abmetrics');
console.log(tracker.formatResultsWith(formatterTable()));
```

Produces:
```
|                 METRIC |        COUNT |          AVG |          MIN |          MAX |          STD |
| schedule response time |              |              |              |              |              |
|                    old |            4 |       118.75 |       100.00 |       126.00 |       119.24 |
|                    new |            4 |       100.00 |        75.00 |       125.00 |       102.53 |
|                        |              |              |              |              |              |
| channels response time |              |              |              |              |              |
|                    old |            1 |        50.00 |        50.00 |        50.00 |        50.00 |
|                    new |            1 |         0.00 |         0.00 |         0.00 |         0.00 |
|                        |              |              |              |              |              |
```