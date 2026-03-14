import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { Experience } from '../lib/resume';
import { companyColors } from '../lib/constants';
import { parseDate, formatDate } from '../lib/dates';

interface Props {
  experience: Experience[];
}

interface CompanyGroup {
  company: string;
  roles: Experience[];
  color: string;
}

export default function ExperienceTimeline({ experience }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [hoveredRole, setHoveredRole] = useState<number | null>(null);

  // Group consecutive roles at the same company
  const groups: CompanyGroup[] = [];
  for (const exp of experience) {
    const last = groups[groups.length - 1];
    if (last && last.company === exp.company) {
      last.roles.push(exp);
    } else {
      groups.push({
        company: exp.company,
        roles: [exp],
        color: companyColors[exp.company] ?? '#06b6d4',
      });
    }
  }

  const toggleCompany = useCallback((company: string) => {
    setExpandedCompany((prev) => (prev === company ? null : company));
  }, []);

  // Compute recency opacity: most recent group = 1.0, oldest = 0.3
  const recencyOpacity = (groupIndex: number): number => {
    if (groups.length <= 1) return 0.9;
    return 0.9 - (groupIndex / (groups.length - 1)) * 0.55;
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const barHeight = 32;
    const barGap = 8;
    const margin = { top: 28, right: 20, bottom: 12, left: 20 };
    const height = margin.top + groups.length * (barHeight + barGap) + margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const allDates = experience.flatMap((e) => [parseDate(e.start), parseDate(e.end)]);
    const minDate = d3.min(allDates)!;
    const maxDate = d3.max(allDates)!;

    // Reversed: present on the left, past on the right
    const x = d3
      .scaleTime()
      .domain([maxDate, minDate])
      .range([margin.left, width - margin.right]);

    // Subtle gradient background highlighting "now" zone
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', 'recency-gradient');
    grad.append('stop').attr('offset', '0%').attr('stop-color', 'var(--color-accent)').attr('stop-opacity', 0.04);
    grad.append('stop').attr('offset', '30%').attr('stop-color', 'var(--color-accent)').attr('stop-opacity', 0.01);
    grad.append('stop').attr('offset', '100%').attr('stop-color', 'var(--color-accent)').attr('stop-opacity', 0);

    svg.append('rect')
      .attr('x', margin.left)
      .attr('y', margin.top - 5)
      .attr('width', width - margin.left - margin.right)
      .attr('height', height - margin.top - margin.bottom + 10)
      .attr('fill', 'url(#recency-gradient)');

    // Year grid — recent years bold and bright, older years fade like a trail
    const years = d3.timeYear.range(d3.timeYear.floor(minDate), d3.timeYear.ceil(maxDate));
    const currentYear = new Date().getFullYear();
    const yearSpan = currentYear - d3.min(years, (d) => d.getFullYear())!;
    const gridGroup = svg.append('g');
    years.forEach((year) => {
      const xPos = x(year);
      const yr = year.getFullYear();
      const recency = 1 - (currentYear - yr) / yearSpan; // 1 = now, 0 = oldest
      const isNow = yr === currentYear;
      const lineOpacity = 0.15 + recency * 0.6;
      const textOpacity = 0.25 + recency * 0.75;

      gridGroup
        .append('line')
        .attr('x1', xPos)
        .attr('x2', xPos)
        .attr('y1', margin.top - 5)
        .attr('y2', height - margin.bottom)
        .attr('stroke', isNow ? 'var(--color-accent)' : 'var(--color-border)')
        .attr('stroke-width', isNow ? 1 : 0.5)
        .attr('stroke-dasharray', isNow ? 'none' : '2,4')
        .attr('opacity', lineOpacity);

      gridGroup
        .append('text')
        .attr('x', xPos)
        .attr('y', margin.top - 10)
        .attr('text-anchor', 'middle')
        .attr('fill', isNow ? 'var(--color-accent)' : 'var(--color-text-muted)')
        .attr('font-size', isNow ? '12px' : `${Math.max(8, 8 + recency * 2)}px`)
        .attr('font-weight', isNow ? '700' : recency > 0.7 ? '500' : '400')
        .attr('font-family', 'var(--font-mono, monospace)')
        .attr('opacity', textOpacity)
        .text(yr);
    });

    // Comet glow filter
    const defs2 = svg.append('defs');
    groups.forEach((group) => {
      const filterId = `glow-${group.company.replace(/\s+/g, '-')}`;
      const filter = defs2.append('filter').attr('id', filterId).attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
      filter.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', '3').attr('result', 'blur');
      filter.append('feColorMatrix').attr('in', 'blur').attr('type', 'matrix')
        .attr('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.6 0');
      const merge = filter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'blur');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    // Draw bars per company group — comet style
    const barsGroup = svg.append('g');
    groups.forEach((group, gi) => {
      const y = margin.top + gi * (barHeight + barGap);
      const isExpanded = expandedCompany === group.company;
      const isOtherExpanded = expandedCompany !== null && !isExpanded;
      const baseOpacity = recencyOpacity(gi);

      // Compute the leading edge of this company's most recent role (first in array)
      const leadRole = group.roles[0];
      const leadX = x(parseDate(leadRole.end));

      // Trail gradient: bright at leading edge, fading toward the past
      const trailGradId = `trail-${gi}`;
      const trailGrad = defs2.append('linearGradient').attr('id', trailGradId)
        .attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%');
      // Since present is on the left (x1=0%), gradient goes bright→fade
      trailGrad.append('stop').attr('offset', '0%').attr('stop-color', group.color).attr('stop-opacity', 1);
      trailGrad.append('stop').attr('offset', '100%').attr('stop-color', group.color).attr('stop-opacity', 0.25);

      // Draw each role segment within the company row
      group.roles.forEach((role, ri) => {
        const xStart = x(parseDate(role.start));
        const xEnd = x(parseDate(role.end));
        const x1 = Math.min(xStart, xEnd);
        const barWidth = Math.max(Math.abs(xEnd - xStart), 4);
        const isCurrent = !role.end;

        const opacity = isOtherExpanded ? 0.15 : isExpanded ? 1 : baseOpacity;

        const rect = barsGroup
          .append('rect')
          .attr('x', x1)
          .attr('y', y)
          .attr('width', barWidth)
          .attr('height', barHeight)
          .attr('rx', 4)
          .attr('fill', `url(#${trailGradId})`)
          .attr('opacity', opacity)
          .style('cursor', 'pointer');

        if (isCurrent) {
          rect
            .attr('stroke', group.color)
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '4,2');
        }

        // Promotion divider between segments
        if (ri > 0) {
          barsGroup
            .append('line')
            .attr('x1', x1)
            .attr('x2', x1)
            .attr('y1', y + 2)
            .attr('y2', y + barHeight - 2)
            .attr('stroke', 'var(--color-bg)')
            .attr('stroke-width', 2)
            .style('pointer-events', 'none');
        }

        // Hit area
        barsGroup
          .append('rect')
          .attr('x', x1)
          .attr('y', y - 2)
          .attr('width', barWidth)
          .attr('height', barHeight + 4)
          .attr('fill', 'transparent')
          .style('cursor', 'pointer')
          .on('click', () => toggleCompany(group.company))
          .on('mouseenter', () => {
            rect.attr('opacity', 1);
            const globalIdx = experience.indexOf(role);
            setHoveredRole(globalIdx);
          })
          .on('mouseleave', () => {
            rect.attr('opacity', opacity);
            setHoveredRole(null);
          });
      });

      // Comet head — bright circle at the leading (present) edge of the company row
      const cometOpacity = isOtherExpanded ? 0.1 : isExpanded ? 1 : Math.min(baseOpacity + 0.2, 1);
      const filterId = `glow-${group.company.replace(/\s+/g, '-')}`;
      const headR = barHeight / 2 - 2;

      // Glow circle (behind)
      barsGroup
        .append('circle')
        .attr('cx', leadX)
        .attr('cy', y + barHeight / 2)
        .attr('r', headR + 3)
        .attr('fill', group.color)
        .attr('opacity', cometOpacity * 0.25)
        .attr('filter', `url(#${filterId})`)
        .style('pointer-events', 'none');

      // Solid comet head
      barsGroup
        .append('circle')
        .attr('cx', leadX)
        .attr('cy', y + barHeight / 2)
        .attr('r', headR)
        .attr('fill', group.color)
        .attr('opacity', cometOpacity)
        .style('pointer-events', 'none');

      // White core
      barsGroup
        .append('circle')
        .attr('cx', leadX)
        .attr('cy', y + barHeight / 2)
        .attr('r', headR * 0.35)
        .attr('fill', '#fff')
        .attr('opacity', cometOpacity * 0.9)
        .style('pointer-events', 'none');
    });
  }, [experience, groups, expandedCompany, toggleCompany]);

  // Find the expanded group
  const expandedGroup = expandedCompany
    ? groups.find((g) => g.company === expandedCompany)
    : null;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Company legend */}
      <div className="flex flex-wrap gap-3 mb-3">
        {groups.map((group, gi) => (
          <button
            key={group.company}
            onClick={() => toggleCompany(group.company)}
            className="flex items-center gap-1.5 text-xs transition-all"
            style={{
              opacity: expandedCompany && expandedCompany !== group.company ? 0.3 : 1,
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: group.color, opacity: recencyOpacity(gi) }}
            />
            <span
              className="transition-colors"
              style={{
                color: expandedCompany === group.company ? group.color : 'var(--color-text-muted)',
                fontWeight: expandedCompany === group.company ? 600 : 400,
              }}
            >
              {group.company}
            </span>
          </button>
        ))}
      </div>

      {/* Timeline SVG */}
      <svg ref={svgRef} className="w-full" />

      {/* Hover tooltip */}
      {hoveredRole !== null && !expandedCompany && (
        <div className="px-4 py-2 mt-1 text-xs border-t border-[var(--color-border)]">
          <span className="font-medium" style={{ color: companyColors[experience[hoveredRole].company] ?? '#06b6d4' }}>
            {experience[hoveredRole].role}
          </span>
          <span className="text-[var(--color-text-muted)] ml-2">
            at {experience[hoveredRole].company} · {formatDate(experience[hoveredRole].start)} — {formatDate(experience[hoveredRole].end)}
          </span>
          <span className="text-[var(--color-text-muted)] ml-2 opacity-50">click to expand</span>
        </div>
      )}

      {/* Expanded role details */}
      {expandedGroup && (
        <div
          className="mt-2 overflow-hidden animate-in"
          style={{
            borderLeft: `3px solid ${expandedGroup.color}`,
            animation: 'slideDown 0.25s ease-out',
          }}
        >
          <div className="pl-5 py-4 space-y-5">
            {/* Company header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: expandedGroup.color }}>
                {expandedGroup.company}
              </h3>
              <button
                onClick={() => setExpandedCompany(null)}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors px-2 py-1 rounded"
              >
                collapse
              </button>
            </div>

            {/* Roles */}
            {expandedGroup.roles.map((role, i) => (
              <div key={i} className="relative">
                {/* Promotion indicator */}
                {i > 0 && (
                  <div className="flex items-center gap-1.5 mb-3 text-xs font-medium" style={{ color: expandedGroup.color }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    Promoted
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-1">
                  <h4 className="font-medium" style={{ color: expandedGroup.color }}>
                    {role.role}
                  </h4>
                  <span className="text-sm text-[var(--color-text-muted)] font-mono whitespace-nowrap">
                    {formatDate(role.start)} — {formatDate(role.end)}
                  </span>
                </div>

                {role.location && (
                  <p className="text-sm text-[var(--color-text-muted)] mb-1">{role.location}</p>
                )}

                {role.description && (
                  <p className="text-sm text-[var(--color-text-muted)] mb-2">{role.description}</p>
                )}

                {role.highlights.length > 0 && (
                  <ul className="space-y-1.5 mb-3">
                    {role.highlights.map((h, hi) => (
                      <li key={hi} className="text-sm flex gap-2">
                        <span className="mt-0.5 shrink-0" style={{ color: expandedGroup.color }}>▸</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {role.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {role.technologies.map((tech, ti) => (
                      <span
                        key={ti}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${expandedGroup.color}15`,
                          color: expandedGroup.color,
                        }}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                {/* Divider between roles (not after last) */}
                {i < expandedGroup.roles.length - 1 && (
                  <div className="border-b border-[var(--color-border)] mt-5" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            max-height: 1000px;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
