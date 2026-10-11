import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getIconLinkForHour } from '@/lib/shared/weather-icons';
import { convertUnixTimeToReadable } from '@/lib/shared/format';
import type { Forecast } from '@/lib/shared/types';

interface GraphProps {
  forecast: Forecast;
  /** Index (0..4) of the day to plot. */
  day: number;
  /** UTC offset (seconds) of the place; used to highlight the current local hour. */
  timezoneOffset: number;
}

interface HourPoint {
  hour: string;
  temperature: number | null;
  precipitation: number;
  cloud: number | null;
  icon: string;
}

const COLORS = { temperature: '#01e97d', rainfall: 'steelblue', clouds: '#D0AF00' } as const;
const MARGIN = { top: 30, right: 20, bottom: 20, left: 20 };
const GRAPH_HEIGHT = 200;

function buildHours(forecast: Forecast, day: number): HourPoint[] {
  const { time, temperature2m, precipitationProbability, weatherCode, cloudCover } = forecast.hourly;
  const start = day * 24;
  return time.slice(start, start + 24).map((iso, i) => {
    const index = start + i;
    const temperature = temperature2m[index];
    return {
      hour: iso.substring(11, 16),
      temperature: temperature == null ? null : Math.round(temperature * 10) / 10,
      precipitation: precipitationProbability[index] ?? 0,
      cloud: cloudCover[index],
      icon: getIconLinkForHour(weatherCode[index], Number(iso.substring(11, 13))),
    };
  });
}

/** Padded [min - 5, max + 5] domain over the non-null values. */
function paddedExtent(values: (number | null)[]): [number, number] {
  const [min, max] = d3.extent(values.filter((v): v is number => v !== null));
  return [(min ?? 0) - 5, (max ?? 0) + 5];
}

export default function Graph({ forecast, day, timezoneOffset }: GraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [showTemperature, setShowTemperature] = useState(true);
  const [showRainfall, setShowRainfall] = useState(true);
  const [showClouds, setShowClouds] = useState(false);

  // Track container width (replaces the legacy window "resize" listener).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || width <= 0) return;

    const data = buildHours(forecast, day);
    if (data.length === 0) return;

    const currentHour = `${convertUnixTimeToReadable(Math.floor(Date.now() / 1000), timezoneOffset).substring(0, 2)}:00`;
    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = GRAPH_HEIGHT - MARGIN.top - MARGIN.bottom;

    const x = d3.scaleBand<string>().range([0, innerWidth]).domain(data.map((d) => d.hour)).padding(0.1);
    const y = d3.scaleLinear().range([innerHeight, 0]).domain([0, 110]);
    const yTemperature = d3.scaleLinear().range([innerHeight, 0]).domain(paddedExtent(data.map((d) => d.temperature)));
    const yCloud = d3.scaleLinear().range([innerHeight, 0]).domain(paddedExtent(data.map((d) => d.cloud)));
    const cx = (d: HourPoint) => (x(d.hour) ?? 0) + x.bandwidth() / 2;

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', GRAPH_HEIGHT)
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Highlight of the current hour (today only).
    svg
      .selectAll('rect.actual-hour')
      .data(data.filter((d) => day === 0 && d.hour === currentHour))
      .enter()
      .append('rect')
      .attr('class', 'actual-hour')
      .attr('x', (d) => x(d.hour) ?? 0)
      .attr('y', y(140))
      .attr('width', x.bandwidth())
      .attr('height', innerHeight + 40)
      .attr('fill', 'rgba(255,255,255,0.3)');

    if (showRainfall) {
      svg
        .selectAll('rect.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (d) => x(d.hour) ?? 0)
        .attr('y', (d) => y(d.precipitation))
        .attr('width', x.bandwidth())
        .attr('height', (d) => innerHeight - y(d.precipitation))
        .attr('fill', COLORS.rainfall);

      svg
        .selectAll('text.precipitation-text')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'precipitation-text')
        .attr('x', cx)
        .attr('y', y(5))
        .attr('text-anchor', 'middle')
        .style('fill', 'rgba(255,255,255,0.5)')
        .style('font-size', '11px')
        .text((d) => (d.precipitation !== 0 ? `${d.precipitation}%` : ''));
    }

    const drawLine = (
      name: string,
      color: string,
      value: (d: HourPoint) => number | null,
      scale: d3.ScaleLinear<number, number>,
    ) => {
      const line = d3
        .line<HourPoint>()
        .defined((d) => value(d) !== null)
        .x(cx)
        .y((d) => scale(value(d) as number))
        .curve(d3.curveMonotoneX);
      const points = data.filter((d) => value(d) !== null);

      svg.append('path').datum(data).attr('class', `${name}-line`).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2).attr('d', line);
      svg
        .selectAll(`circle.${name}-dot`)
        .data(points)
        .enter()
        .append('circle')
        .attr('class', `${name}-dot`)
        .attr('cx', cx)
        .attr('cy', (d) => scale(value(d) as number))
        .attr('r', 3)
        .style('fill', color);
      svg
        .selectAll(`text.${name}-text`)
        .data(points)
        .enter()
        .append('text')
        .attr('class', `${name}-text`)
        .attr('x', cx)
        .attr('y', (d) => scale(value(d) as number) - 10)
        .attr('text-anchor', 'middle')
        .style('fill', color)
        .style('font-size', '12px')
        .text((d) => String(value(d)));
    };

    if (showClouds) drawLine('clouds', COLORS.clouds, (d) => d.cloud, yCloud);
    if (showTemperature) drawLine('temperature', COLORS.temperature, (d) => d.temperature, yTemperature);

    svg.append('g').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x));

    svg
      .selectAll('image.weather-icon')
      .data(data)
      .enter()
      .append('image')
      .attr('class', 'weather-icon')
      .attr('href', (d) => d.icon)
      .attr('x', (d) => cx(d) - 15)
      .attr('y', y(135))
      .attr('width', 30)
      .attr('height', 30);

    return () => {
      d3.select(container).selectAll('svg').remove();
    };
  }, [forecast, day, timezoneOffset, width, showTemperature, showRainfall, showClouds]);

  return (
    <div className="graph" style={{ width: '100%', height: `${GRAPH_HEIGHT}px` }}>
      <div id="precipitation" style={{ width: '80%', height: '100%' }} ref={containerRef} />
      <div className="graph-options" style={{ width: '20%', height: '100%' }}>
        <div className="checkbox-wrapper-2">
          <label htmlFor="temperature" className="temperature-label">
            <input type="checkbox" className="sc-gJwTLC ikxBAC" id="temperature" checked={showTemperature} onChange={() => setShowTemperature((v) => !v)} />
            Temperature
          </label>
          <label htmlFor="rainfall" className="rainfall-label">
            <input type="checkbox" className="sc-gJwTLC ikxBAC" id="rainfall" checked={showRainfall} onChange={() => setShowRainfall((v) => !v)} />
            Rainfall
          </label>
          <label htmlFor="clouds" className="clouds-label">
            <input type="checkbox" className="sc-gJwTLC ikxBAC" id="clouds" checked={showClouds} onChange={() => setShowClouds((v) => !v)} />
            Clouds
          </label>
        </div>
      </div>
    </div>
  );
}
