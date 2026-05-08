import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, CandlestickSeries } from 'lightweight-charts';
import { useEffect, useRef } from 'react';

interface ChartProps {
  data: CandlestickData[];
  symbol: string;
}

export function Chart({ data, symbol }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#050505' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(38, 38, 38, 0.5)' },
        horzLines: { color: 'rgba(38, 38, 38, 0.5)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    series.setData(data);
    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <span className="text-xl font-bold text-white">{symbol}/USD</span>
        <span className="text-xs text-gray-500 font-mono italic uppercase">Technical Chart</span>
      </div>
      <div ref={chartContainerRef} className="w-full h-full border border-[#141414]" />
    </div>
  );
}
