import Highcharts from 'highcharts';
import HighchartsMore from 'highcharts/highcharts-more';
import SolidGauge from 'highcharts/modules/solid-gauge';
import Highcharts3D from 'highcharts/highcharts-3d';

// Highcharts v13 modules self-register on import via the UMD wrapper.
// Only call as factory if the export is still a function (v10 and earlier).
if (typeof HighchartsMore === 'function') HighchartsMore(Highcharts);
if (typeof SolidGauge === 'function') SolidGauge(Highcharts);
if (typeof Highcharts3D === 'function') Highcharts3D(Highcharts);

export default Highcharts;
