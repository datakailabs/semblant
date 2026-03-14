import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { SkillGroup, Certification, Project } from '../lib/resume';
import { categoryColors, certSkillMap } from '../lib/constants';

interface Props {
  skills: SkillGroup[];
  certifications: Certification[];
  projects: Project[];
}

type NodeType = 'skill' | 'certification' | 'project';

interface PlacedNode {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
  radius: number;
  color: string;
  // Skill-specific
  category?: string;
  level?: number;
  // Cert/project-specific
  data?: Certification | Project;
  connectedSkillIds?: string[];
}

interface Link {
  sourceId: string;
  targetId: string;
}

interface DetailPanel {
  type: NodeType;
  label: string;
  color: string;
  description?: string;
  url?: string;
  technologies?: string[];
  level?: number;
  category?: string;
  issuer?: string;
  connectedSkills?: string[];
  connectedProjects?: string[];
  connectedCerts?: string[];
}

export default function SkillsEcosystem({ skills, certifications, projects }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<DetailPanel | null>(null);

  const allSkillNames = skills.flatMap((g) => g.items.map((i) => i.name));

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 650;
    const cx = width / 2;
    const cy = height / 2;

    const skillRingR = Math.min(width, height) * 0.28;
    const outerRingR = Math.min(width, height) * 0.44;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g');

    // Background gradient
    const defs = svg.append('defs');
    const bg = defs.append('radialGradient').attr('id', 'eco-bg');
    bg.append('stop').attr('offset', '0%').attr('stop-color', 'var(--color-accent)').attr('stop-opacity', 0.03);
    bg.append('stop').attr('offset', '100%').attr('stop-color', 'var(--color-accent)').attr('stop-opacity', 0);
    g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', outerRingR + 60).attr('fill', 'url(#eco-bg)');

    // Ring guides
    g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', skillRingR)
      .attr('fill', 'none').attr('stroke', 'var(--color-border)').attr('stroke-width', 0.5).attr('stroke-dasharray', '4,8');
    g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', outerRingR)
      .attr('fill', 'none').attr('stroke', 'var(--color-border)').attr('stroke-width', 0.3).attr('stroke-dasharray', '2,10');

    // ── Place skill nodes on inner ring ──
    const nodes: PlacedNode[] = [];
    const skillAngleMap = new Map<string, number>(); // skill name → angle
    const totalItems = skills.reduce((s, g) => s + g.items.length, 0);
    const categoryGap = Math.PI * 2 * 0.06;
    const availableAngle = Math.PI * 2 - categoryGap * skills.length;
    let angle = -Math.PI / 2;

    skills.forEach((group) => {
      const catAngle = (group.items.length / totalItems) * availableAngle;
      const color = categoryColors[group.category] ?? '#06b6d4';

      // Category arc
      const arcGen = d3.arc()
        .innerRadius(skillRingR + 18).outerRadius(skillRingR + 21)
        .startAngle(angle + Math.PI / 2).endAngle(angle + catAngle + Math.PI / 2).padAngle(0.02);
      g.append('path').attr('d', arcGen({} as any) as string)
        .attr('transform', `translate(${cx},${cy})`).attr('fill', color).attr('opacity', 0.4);

      // Category label — curved along the ring, outside the arc
      const catLabelR = skillRingR + 32;
      const catPathId = `cat-path-${group.category.replace(/[^a-zA-Z0-9]/g, '')}`;
      const catMid = angle + catAngle / 2;
      // For text on a circle to read correctly:
      // Right side (cos > 0): clockwise arc, text baseline faces outward
      // Left side (cos < 0): counter-clockwise arc, text flips to stay readable
      const midCos = Math.cos(catMid);
      const arcSpan = catAngle / 2 + 0.1;

      // Determine if text on this arc would be upside down.
      // Text along a clockwise arc reads correctly on the top half of the circle (sin < 0).
      // On the bottom half (sin > 0), we need a counter-clockwise arc to flip the text.
      const midSin = Math.sin(catMid);

      if (midSin <= 0) {
        // Top half: clockwise arc — text reads left to right naturally
        const startA = catMid - arcSpan;
        const endA = catMid + arcSpan;
        defs.append('path').attr('id', catPathId)
          .attr('d', `M ${cx + Math.cos(startA) * catLabelR},${cy + Math.sin(startA) * catLabelR} A ${catLabelR},${catLabelR} 0 0,1 ${cx + Math.cos(endA) * catLabelR},${cy + Math.sin(endA) * catLabelR}`);
      } else {
        // Bottom half: counter-clockwise arc — flips text so it reads correctly
        const startA = catMid + arcSpan;
        const endA = catMid - arcSpan;
        defs.append('path').attr('id', catPathId)
          .attr('d', `M ${cx + Math.cos(startA) * catLabelR},${cy + Math.sin(startA) * catLabelR} A ${catLabelR},${catLabelR} 0 0,0 ${cx + Math.cos(endA) * catLabelR},${cy + Math.sin(endA) * catLabelR}`);
      }

      g.append('text')
        .attr('opacity', 0.5)
        .style('pointer-events', 'none')
        .append('textPath')
        .attr('href', `#${catPathId}`)
        .attr('startOffset', '50%')
        .attr('text-anchor', 'middle')
        .attr('fill', color)
        .attr('font-size', '9px')
        .attr('font-weight', '600')
        .attr('letter-spacing', '0.15em')
        .text(group.category.toUpperCase());

      group.items.forEach((item, ii) => {
        const t = (ii + 0.5) / group.items.length;
        const a = angle + t * catAngle;
        const r = 5 + (item.level / 100) * 14;
        skillAngleMap.set(item.name, a);

        nodes.push({
          id: `skill:${item.name}`,
          label: item.name,
          type: 'skill',
          x: cx + Math.cos(a) * skillRingR,
          y: cy + Math.sin(a) * skillRingR,
          radius: r,
          color,
          category: group.category,
          level: item.level,
        });
      });

      angle += catAngle + categoryGap;
    });

    // ── Place outer ring nodes (certs + projects) ──
    const links: Link[] = [];

    // Compute angle for each outer node based on average angle of connected skills
    interface OuterItem {
      id: string;
      label: string;
      type: 'certification' | 'project';
      color: string;
      data: Certification | Project;
      connectedSkillIds: string[];
      angle: number;
    }

    const outerItems: OuterItem[] = [];

    certifications.forEach((cert) => {
      const related = (certSkillMap[cert.issuer] ?? []).filter((s) => allSkillNames.includes(s));
      const angles = related.map((s) => skillAngleMap.get(s)).filter((a): a is number => a !== undefined);
      const avgAngle = angles.length > 0 ? d3.mean(angles)! : Math.random() * Math.PI * 2;
      const connectedIds = related.map((s) => `skill:${s}`);

      outerItems.push({
        id: `cert:${cert.name}`,
        label: cert.name.replace(/Partner Training - /g, '').replace(/Certified /g, ''),
        type: 'certification',
        color: '#f97316',
        data: cert,
        connectedSkillIds: connectedIds,
        angle: avgAngle,
      });

      connectedIds.forEach((sid) => links.push({ sourceId: `cert:${cert.name}`, targetId: sid }));
    });

    projects.forEach((proj) => {
      const related = proj.technologies.filter((t) => allSkillNames.includes(t));
      const angles = related.map((s) => skillAngleMap.get(s)).filter((a): a is number => a !== undefined);
      const avgAngle = angles.length > 0 ? d3.mean(angles)! : Math.random() * Math.PI * 2;
      const connectedIds = related.map((s) => `skill:${s}`);

      outerItems.push({
        id: `project:${proj.name}`,
        label: proj.name,
        type: 'project',
        color: '#3b82f6',
        data: proj,
        connectedSkillIds: connectedIds,
        angle: avgAngle,
      });

      connectedIds.forEach((sid) => links.push({ sourceId: `project:${proj.name}`, targetId: sid }));
    });

    // Sort by angle then spread to avoid overlap
    outerItems.sort((a, b) => a.angle - b.angle);
    const minAngularGap = 0.22; // ~12.5 degrees minimum between outer nodes
    for (let i = 1; i < outerItems.length; i++) {
      const gap = outerItems[i].angle - outerItems[i - 1].angle;
      if (gap < minAngularGap) {
        outerItems[i].angle = outerItems[i - 1].angle + minAngularGap;
      }
    }
    // Wrap check
    if (outerItems.length > 1) {
      const first = outerItems[0];
      const last = outerItems[outerItems.length - 1];
      const wrapGap = (first.angle + Math.PI * 2) - last.angle;
      if (wrapGap < minAngularGap) {
        last.angle = first.angle + Math.PI * 2 - minAngularGap;
      }
    }

    outerItems.forEach((item) => {
      const r = item.type === 'project' ? 12 : 8;
      nodes.push({
        id: item.id,
        label: item.label,
        type: item.type,
        x: cx + Math.cos(item.angle) * outerRingR,
        y: cy + Math.sin(item.angle) * outerRingR,
        radius: r,
        color: item.color,
        data: item.data,
        connectedSkillIds: item.connectedSkillIds,
      });
    });

    // ── Build node lookup ──
    const nodeMap = new Map<string, PlacedNode>();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    // Connection lookup
    const connectionMap = new Map<string, Set<string>>();
    links.forEach((l) => {
      if (!connectionMap.has(l.sourceId)) connectionMap.set(l.sourceId, new Set());
      if (!connectionMap.has(l.targetId)) connectionMap.set(l.targetId, new Set());
      connectionMap.get(l.sourceId)!.add(l.targetId);
      connectionMap.get(l.targetId)!.add(l.sourceId);
    });

    function getConnected(nodeId: string): Set<string> {
      const set = new Set<string>([nodeId]);
      (connectionMap.get(nodeId) ?? new Set()).forEach((id) => set.add(id));
      return set;
    }

    // ── Draw links ──
    const linkGroup = g.append('g');
    links.forEach((l) => {
      const src = nodeMap.get(l.sourceId);
      const tgt = nodeMap.get(l.targetId);
      if (!src || !tgt) return;

      linkGroup.append('line')
        .attr('x1', src.x).attr('y1', src.y)
        .attr('x2', tgt.x).attr('y2', tgt.y)
        .attr('stroke', src.type === 'certification' ? '#f9731620' : '#3b82f618')
        .attr('stroke-width', 1)
        .attr('data-source', l.sourceId)
        .attr('data-target', l.targetId);
    });

    // ── Draw nodes ──
    const nodeGroup = g.append('g');
    nodes.forEach((node) => {
      const ng = nodeGroup.append('g')
        .attr('transform', `translate(${node.x},${node.y})`)
        .attr('data-id', node.id)
        .style('cursor', 'pointer');

      // Shape
      if (node.type === 'skill') {
        ng.append('circle').attr('r', node.radius)
          .attr('fill', node.color).attr('opacity', 0.8).attr('class', 'node-shape');
        // Level ring
        ng.append('circle').attr('r', node.radius + 2)
          .attr('fill', 'none').attr('stroke', node.color).attr('stroke-width', 1.5)
          .attr('stroke-dasharray', `${(node.level! / 100) * Math.PI * 2 * (node.radius + 2)} ${Math.PI * 2 * (node.radius + 2)}`)
          .attr('transform', 'rotate(-90)').attr('opacity', 0.4);
      } else if (node.type === 'certification') {
        const s = node.radius;
        ng.append('path').attr('d', `M0,${-s} L${s},0 L0,${s} L${-s},0 Z`)
          .attr('fill', node.color).attr('opacity', 0.8).attr('class', 'node-shape');
      } else {
        ng.append('rect')
          .attr('x', -node.radius).attr('y', -node.radius * 0.6)
          .attr('width', node.radius * 2).attr('height', node.radius * 1.2).attr('rx', 4)
          .attr('fill', node.color).attr('opacity', 0.8).attr('class', 'node-shape');
      }

      // Label — for Data and Infrastructure skills, place label above (they're on the bottom half)
      const bottomCategories = ['Data', 'Infrastructure'];
      const isBottomSkill = node.type === 'skill' && bottomCategories.includes(node.category ?? '');
      const labelDy = isBottomSkill
        ? -(node.radius + 8)  // above the node
        : node.radius + (node.type === 'skill' ? 14 : 16); // below the node

      ng.append('text')
        .text(node.label.length > 22 ? node.label.slice(0, 20) + '…' : node.label)
        .attr('dy', labelDy)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--color-text-muted)')
        .attr('font-size', node.type === 'skill' ? '10px' : '9px')
        .attr('font-weight', node.type === 'skill' ? '400' : '500')
        .attr('class', 'node-label')
        .style('pointer-events', 'none');

      // Interactions
      ng.on('mouseenter', () => {
        const connected = getConnected(node.id);
        // Dim everything
        nodeGroup.selectAll('g').each(function () {
          const el = d3.select(this);
          const id = el.attr('data-id');
          const isConn = connected.has(id);
          el.select('.node-shape').attr('opacity', isConn ? 1 : 0.1);
          el.select('.node-label').attr('opacity', isConn ? 1 : 0.15);
        });
        linkGroup.selectAll('line').each(function () {
          const el = d3.select(this);
          const src = el.attr('data-source');
          const tgt = el.attr('data-target');
          const isConn = connected.has(src) && connected.has(tgt);
          el.attr('stroke-opacity', isConn ? 1 : 0.03)
            .attr('stroke-width', isConn ? 2 : 0.5)
            .attr('stroke', isConn
              ? (src.startsWith('cert:') ? '#f97316' : '#3b82f6')
              : el.attr('stroke'));
        });
      })
        .on('mouseleave', () => {
          nodeGroup.selectAll('.node-shape').attr('opacity', 0.8);
          nodeGroup.selectAll('.node-label').attr('opacity', 1);
          linkGroup.selectAll('line')
            .attr('stroke-opacity', 1).attr('stroke-width', 1)
            .each(function () {
              const el = d3.select(this);
              const src = el.attr('data-source');
              el.attr('stroke', src.startsWith('cert:') ? '#f9731620' : '#3b82f618');
            });
        })
        .on('click', () => {
          const connected = getConnected(node.id);
          const connectedNodes = [...connected]
            .filter((id) => id !== node.id)
            .map((id) => nodeMap.get(id))
            .filter((n): n is PlacedNode => !!n);

          if (node.type === 'skill') {
            setDetail({
              type: 'skill', label: node.label, color: node.color,
              level: node.level, category: node.category,
              connectedCerts: connectedNodes.filter((n) => n.type === 'certification').map((n) => n.label),
              connectedProjects: connectedNodes.filter((n) => n.type === 'project').map((n) => n.label),
            });
          } else if (node.type === 'certification') {
            const cert = node.data as Certification;
            setDetail({
              type: 'certification', label: node.label, color: node.color,
              issuer: cert.issuer, url: cert.url,
              connectedSkills: connectedNodes.filter((n) => n.type === 'skill').map((n) => n.label),
            });
          } else {
            const proj = node.data as Project;
            setDetail({
              type: 'project', label: proj.name, color: node.color,
              description: proj.description, url: proj.url, technologies: proj.technologies,
              connectedSkills: connectedNodes.filter((n) => n.type === 'skill').map((n) => n.label),
            });
          }
        });
    });
  }, [skills, certifications, projects, allSkillNames]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[var(--color-accent)] opacity-80" /> Skills
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rotate-45 bg-[#f97316] opacity-80" /> Certifications
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 rounded-sm bg-[#3b82f6] opacity-80" /> Projects
          </span>
        </div>
        <span className="text-xs text-[var(--color-text-muted)] opacity-40">hover to explore · click for details</span>
      </div>

      <svg ref={svgRef} className="w-full" style={{ minHeight: 650 }} />

      {/* Detail panel */}
      {detail && (
        <div className="mt-2 overflow-hidden" style={{ borderLeft: `3px solid ${detail.color}`, animation: 'slideDown 0.2s ease-out' }}>
          <div className="pl-5 py-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider opacity-60" style={{ color: detail.color }}>{detail.type}</span>
                <h3 className="text-lg font-semibold" style={{ color: detail.color }}>{detail.label}</h3>
              </div>
              <button onClick={() => setDetail(null)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors px-2 py-1 rounded">close</button>
            </div>

            {detail.type === 'skill' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--color-text-muted)]">{detail.category}</span>
                  <div className="flex-1 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden max-w-48">
                    <div className="h-full rounded-full" style={{ width: `${detail.level}%`, backgroundColor: detail.color }} />
                  </div>
                  <span className="text-xs font-mono" style={{ color: detail.color }}>{detail.level}%</span>
                </div>
                {detail.connectedCerts && detail.connectedCerts.length > 0 && (
                  <div><span className="text-xs text-[var(--color-text-muted)]">Validated by: </span>
                    {detail.connectedCerts.map((c, i) => <span key={i} className="text-xs text-[#f97316] ml-1">{c}{i < detail.connectedCerts!.length - 1 ? ',' : ''}</span>)}
                  </div>
                )}
                {detail.connectedProjects && detail.connectedProjects.length > 0 && (
                  <div><span className="text-xs text-[var(--color-text-muted)]">Used in: </span>
                    {detail.connectedProjects.map((p, i) => <span key={i} className="text-xs text-[#3b82f6] ml-1">{p}{i < detail.connectedProjects!.length - 1 ? ',' : ''}</span>)}
                  </div>
                )}
              </div>
            )}

            {detail.type === 'certification' && (
              <div className="space-y-2">
                <p className="text-sm text-[var(--color-text-muted)]">Issued by {detail.issuer}</p>
                {detail.connectedSkills && detail.connectedSkills.length > 0 && (
                  <div><span className="text-xs text-[var(--color-text-muted)]">Validates: </span>
                    {detail.connectedSkills.map((s, i) => <span key={i} className="text-xs text-[var(--color-accent)] ml-1">{s}{i < detail.connectedSkills!.length - 1 ? ',' : ''}</span>)}
                  </div>
                )}
                {detail.url && (
                  <a href={detail.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs hover:opacity-80" style={{ color: detail.color }}>
                    View credential <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                )}
              </div>
            )}

            {detail.type === 'project' && (
              <div className="space-y-2">
                <p className="text-sm text-[var(--color-text-muted)]">{detail.description}</p>
                {detail.technologies && detail.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {detail.technologies.map((t, i) => <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${detail.color}15`, color: detail.color }}>{t}</span>)}
                  </div>
                )}
                {detail.url && (
                  <a href={detail.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs hover:opacity-80" style={{ color: detail.color }}>
                    Visit project <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
