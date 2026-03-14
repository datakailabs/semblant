package pdf

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/datakailabs/semblant/internal/resume"
	"github.com/signintech/gopdf"
)

// Renderer generates a PDF from resume data.
type Renderer struct {
	pdf     gopdf.GoPdf
	theme   Theme
	y       float64
	pageNum int
}

// NewRenderer creates a Renderer with the default theme.
func NewRenderer() *Renderer {
	return &Renderer{
		theme:   DefaultTheme(),
		pageNum: 1,
	}
}

// Render writes a complete PDF to w.
func (r *Renderer) Render(w io.Writer, res *resume.Resume) error {
	r.pdf.Start(gopdf.Config{PageSize: *gopdf.PageSizeA4})

	if err := r.loadFonts(); err != nil {
		return err
	}

	r.pdf.AddPage()
	r.y = r.theme.MarginT

	r.renderHeader(res.Personal)
	r.renderExperience(res.Experience)
	r.renderEducation(res.Education)
	r.renderLanguages(res.Languages)
	r.renderSkills(res.Skills)
	r.renderCertifications(res.Certifications)
	r.renderProjects(res.Projects)

	r.drawPageNumber()

	return r.pdf.Write(w)
}

func fontsDir() string {
	_, filename, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(filename), "fonts")
}

func (r *Renderer) loadFonts() error {
	fdir := "/fonts"
	if _, err := os.Stat(filepath.Join(fdir, "Inter-Regular.ttf")); err != nil {
		fdir = fontsDir()
		if _, err := os.Stat(filepath.Join(fdir, "Inter-Regular.ttf")); err != nil {
			fdir = "internal/pdf/fonts"
		}
	}

	if err := r.pdf.AddTTFFont("Inter", filepath.Join(fdir, "Inter-Regular.ttf")); err != nil {
		return fmt.Errorf("loading Inter-Regular: %w", err)
	}
	if err := r.pdf.AddTTFFont("Inter-Bold", filepath.Join(fdir, "Inter-Bold.ttf")); err != nil {
		return fmt.Errorf("loading Inter-Bold: %w", err)
	}
	if err := r.pdf.AddTTFFont("Inter-Medium", filepath.Join(fdir, "Inter-Medium.ttf")); err != nil {
		return fmt.Errorf("loading Inter-Medium: %w", err)
	}
	return nil
}

func (r *Renderer) setColor(c Color) {
	r.pdf.SetTextColor(c.R, c.G, c.B)
}

func (r *Renderer) ensureSpace(needed float64) {
	if r.y > r.theme.PageH-r.theme.MarginB-needed {
		r.drawPageNumber()
		r.pageNum++
		r.pdf.AddPage()
		r.y = r.theme.MarginT
	}
}

func (r *Renderer) sectionTitle(title string) {
	t := r.theme
	colW := t.ColW()
	r.pdf.SetFont("Inter-Bold", "", t.FontSizeSection)
	r.setColor(t.Accent)
	r.pdf.SetXY(t.MarginL, r.y)
	r.pdf.Cell(nil, title)

	tw, _ := r.pdf.MeasureTextWidth(title)
	r.pdf.SetStrokeColor(t.Border.R, t.Border.G, t.Border.B)
	r.pdf.SetLineWidth(0.3)
	r.pdf.Line(t.MarginL+tw+6, r.y+4, t.MarginL+colW, r.y+4)

	r.y += 14
}

func (r *Renderer) wrapText(text string, x, maxW, lineH float64) {
	words := strings.Fields(text)
	line := ""
	for _, word := range words {
		test := line
		if test != "" {
			test += " "
		}
		test += word
		tw, _ := r.pdf.MeasureTextWidth(test)
		if tw > maxW && line != "" {
			r.pdf.SetXY(x, r.y)
			r.pdf.Cell(nil, line)
			r.y += lineH
			line = word
		} else {
			line = test
		}
	}
	if line != "" {
		r.pdf.SetXY(x, r.y)
		r.pdf.Cell(nil, line)
		r.y += lineH
	}
}

func (r *Renderer) drawPageNumber() {
	t := r.theme
	r.pdf.SetFont("Inter", "", t.FontSizePageNum)
	r.setColor(t.Muted)
	text := fmt.Sprintf("%d", r.pageNum)
	tw, _ := r.pdf.MeasureTextWidth(text)
	r.pdf.SetXY(t.PageW/2-tw/2, t.PageH-t.MarginB+10)
	r.pdf.Cell(nil, text)
}

// ── Section renderers ──

func (r *Renderer) renderHeader(p resume.Personal) {
	t := r.theme
	colW := t.ColW()

	// Name
	r.pdf.SetFont("Inter-Bold", "", t.FontSizeName)
	r.setColor(t.Text)
	r.pdf.SetXY(t.MarginL, r.y)
	r.pdf.Cell(nil, p.Name)
	r.y += 27

	// Title
	r.pdf.SetFont("Inter-Medium", "", t.FontSizeTitle)
	r.setColor(t.Accent)
	r.pdf.SetXY(t.MarginL, r.y)
	r.pdf.Cell(nil, p.Title)
	r.y += 16

	// Bio
	r.pdf.SetFont("Inter", "", t.FontSizeBio)
	r.setColor(t.Muted)
	r.wrapText(p.Bio, t.MarginL, colW, t.LineHeightBio)
	r.y += 4

	// Contact line
	r.pdf.SetFont("Inter", "", t.FontSizeBody)
	contactParts := []string{}
	for _, c := range p.Contact {
		contactParts = append(contactParts, c.Value)
	}
	if p.Website != "" {
		contactParts = append(contactParts, p.Website)
	}
	for _, link := range p.Links {
		contactParts = append(contactParts, link.URL)
	}
	if len(contactParts) > 0 {
		r.setColor(t.Muted)
		r.pdf.SetXY(t.MarginL, r.y)
		r.pdf.Cell(nil, strings.Join(contactParts, "  ·  "))
		r.y += 12
	}

	// Accent line
	r.pdf.SetStrokeColor(t.Accent.R, t.Accent.G, t.Accent.B)
	r.pdf.SetLineWidth(1.5)
	r.pdf.Line(t.MarginL, r.y, t.MarginL+60, r.y)
	r.y += 14
}

func (r *Renderer) renderExperience(exps []resume.Experience) {
	t := r.theme
	colW := t.ColW()

	r.sectionTitle("EXPERIENCE")

	for i, exp := range exps {
		needed := 42.0
		if exp.Description != "" {
			needed += 12
		}
		needed += float64(min(len(exp.Highlights), 2)) * 13
		r.ensureSpace(needed)

		// Role + dates
		r.pdf.SetFont("Inter-Bold", "", 9.5)
		r.setColor(t.Text)
		r.pdf.SetXY(t.MarginL, r.y)
		r.pdf.Cell(nil, exp.Role)

		dateStr := formatDateRange(exp.Start, exp.End)
		r.pdf.SetFont("Inter", "", t.FontSizeBody)
		r.setColor(t.Muted)
		tw, _ := r.pdf.MeasureTextWidth(dateStr)
		r.pdf.SetXY(t.MarginL+colW-tw, r.y+1.5)
		r.pdf.Cell(nil, dateStr)
		r.y += 13

		// Company (hyperlinked via exp.URL)
		r.pdf.SetFont("Inter-Medium", "", t.FontSizeBio)
		r.setColor(t.Accent)
		r.pdf.SetXY(t.MarginL, r.y)
		r.pdf.Cell(nil, exp.Company)
		if exp.URL != "" {
			tw, _ := r.pdf.MeasureTextWidth(exp.Company)
			r.pdf.AddExternalLink(exp.URL, t.MarginL, r.y-1, tw, 10)
		}
		if exp.Location != "" {
			r.setColor(t.Muted)
			tw, _ := r.pdf.MeasureTextWidth(exp.Company)
			r.pdf.SetXY(t.MarginL+tw, r.y)
			r.pdf.Cell(nil, "  ·  "+exp.Location)
		}
		r.y += 12

		// Description
		if exp.Description != "" {
			r.pdf.SetFont("Inter", "", t.FontSizeBody)
			r.setColor(t.Muted)
			r.wrapText(exp.Description, t.MarginL, colW, t.LineHeightBody)
			r.y += 2
		}

		// Highlights
		for _, h := range exp.Highlights {
			r.ensureSpace(15)
			r.pdf.SetFont("Inter", "", t.FontSizeBody)
			r.setColor(t.Text)
			r.pdf.SetXY(t.MarginL+4, r.y)
			r.setColor(t.Accent)
			r.pdf.Cell(nil, "▸")
			r.setColor(t.Text)
			r.wrapText(h, t.MarginL+14, colW-14, t.LineHeightBody)
			r.y += 1
		}

		// Technology tags
		if len(exp.Technologies) > 0 {
			r.y += 1
			r.pdf.SetFont("Inter", "", t.FontSizeTag)
			tagX := t.MarginL
			for _, tech := range exp.Technologies {
				tw, _ := r.pdf.MeasureTextWidth(tech)
				tagW := tw + 8
				tagH := 11.0

				if tagX+tagW > t.MarginL+colW {
					tagX = t.MarginL
					r.y += tagH + 2
				}

				r.pdf.SetFillColor(t.TagBg.R, t.TagBg.G, t.TagBg.B)
				r.pdf.Rectangle(tagX, r.y, tagX+tagW, r.y+tagH, "F", 0, 0)

				r.setColor(t.Accent)
				r.pdf.SetXY(tagX+4, r.y+2)
				r.pdf.Cell(nil, tech)

				tagX += tagW + 3
			}
			r.y += 14
		}

		// Divider between entries
		if i < len(exps)-1 {
			r.pdf.SetStrokeColor(t.Border.R, t.Border.G, t.Border.B)
			r.pdf.SetLineWidth(0.3)
			r.pdf.Line(t.MarginL, r.y, t.MarginL+colW*0.3, r.y)
			r.y += 8
		}
	}
}

func (r *Renderer) renderEducation(edus []resume.Education) {
	t := r.theme
	colW := t.ColW()

	r.ensureSpace(70)
	r.y += 4
	r.sectionTitle("EDUCATION")

	for _, edu := range edus {
		r.pdf.SetFont("Inter-Bold", "", t.FontSizeBio)
		r.setColor(t.Text)
		r.pdf.SetXY(t.MarginL, r.y)
		r.pdf.Cell(nil, edu.Degree)

		if edu.Start != "" || edu.End != "" {
			dateStr := ""
			if edu.Start != "" && edu.End != "" {
				dateStr = edu.Start + " — " + edu.End
			} else if edu.End != "" {
				dateStr = edu.End
			}
			r.pdf.SetFont("Inter", "", t.FontSizeBody)
			r.setColor(t.Muted)
			tw, _ := r.pdf.MeasureTextWidth(dateStr)
			r.pdf.SetXY(t.MarginL+colW-tw, r.y+1)
			r.pdf.Cell(nil, dateStr)
		}
		r.y += 12

		r.pdf.SetFont("Inter", "", t.FontSizeBody)
		r.setColor(t.Accent)
		r.pdf.SetXY(t.MarginL, r.y)
		instLine := edu.Institution
		if edu.Location != "" {
			instLine += "  ·  " + edu.Location
		}
		r.pdf.Cell(nil, instLine)
		r.y += 14
	}
}

func (r *Renderer) renderLanguages(langs []resume.Language) {
	t := r.theme

	r.y += 4
	r.sectionTitle("LANGUAGES")
	langParts := []string{}
	for _, lang := range langs {
		langParts = append(langParts, fmt.Sprintf("%s (%s)", lang.Name, lang.Proficiency))
	}
	r.pdf.SetFont("Inter", "", 8)
	r.setColor(t.Text)
	r.pdf.SetXY(t.MarginL, r.y)
	r.pdf.Cell(nil, strings.Join(langParts, "  ·  "))
	r.y += 14
}

func (r *Renderer) renderSkills(groups []resume.SkillGroup) {
	t := r.theme
	colW := t.ColW()

	r.ensureSpace(80)
	r.sectionTitle("SKILLS")

	halfCol := (colW - 12) / 2
	skillStartY := r.y
	for gi, group := range groups {
		col := gi % 2
		if col == 0 && gi > 0 {
			skillStartY = r.y + 4
		}
		cx := t.MarginL + float64(col)*(halfCol+12)
		cy := skillStartY

		r.pdf.SetFont("Inter-Medium", "", 8)
		r.setColor(t.Accent)
		r.pdf.SetXY(cx, cy)
		r.pdf.Cell(nil, group.Category)
		cy += 11

		skillNames := []string{}
		for _, item := range group.Items {
			skillNames = append(skillNames, item.Name)
		}
		r.pdf.SetFont("Inter", "", t.FontSizeBody)
		r.setColor(t.Text)

		// Inline wrapText at custom position
		words := strings.Fields(strings.Join(skillNames, "  ·  "))
		line := ""
		for _, word := range words {
			test := line
			if test != "" {
				test += " "
			}
			test += word
			tw, _ := r.pdf.MeasureTextWidth(test)
			if tw > halfCol && line != "" {
				r.pdf.SetXY(cx, cy)
				r.pdf.Cell(nil, line)
				cy += 10
				line = word
			} else {
				line = test
			}
		}
		if line != "" {
			r.pdf.SetXY(cx, cy)
			r.pdf.Cell(nil, line)
			cy += 10
		}

		if col == 1 || gi == len(groups)-1 {
			if cy > r.y {
				r.y = cy
			}
		}
	}
	r.y += 8
}

func (r *Renderer) renderCertifications(certs []resume.Certification) {
	t := r.theme
	colW := t.ColW()

	r.sectionTitle("CERTIFICATIONS")
	for _, cert := range certs {
		r.ensureSpace(15)

		r.pdf.SetFont("Inter", "", t.FontSizeBody)
		if cert.URL != "" {
			r.setColor(t.Accent)
		} else {
			r.setColor(t.Text)
		}
		r.pdf.SetXY(t.MarginL, r.y)
		r.pdf.Cell(nil, cert.Name)
		if cert.URL != "" {
			tw, _ := r.pdf.MeasureTextWidth(cert.Name)
			r.pdf.AddExternalLink(cert.URL, t.MarginL, r.y-1, tw, 10)
		}

		r.pdf.SetFont("Inter", "", t.FontSizeSmall)
		r.setColor(t.Muted)
		tw, _ := r.pdf.MeasureTextWidth(cert.Issuer)
		r.pdf.SetXY(t.MarginL+colW-tw, r.y+0.5)
		r.pdf.Cell(nil, cert.Issuer)
		r.y += 12
	}
	r.y += 4
}

func (r *Renderer) renderProjects(projs []resume.Project) {
	t := r.theme
	colW := t.ColW()

	// Projects always start on a new page
	r.drawPageNumber()
	r.pageNum++
	r.pdf.AddPage()
	r.y = t.MarginT

	r.sectionTitle("PROJECTS")
	for _, proj := range projs {
		r.ensureSpace(25)

		r.pdf.SetFont("Inter-Bold", "", 8)
		if proj.URL != "" {
			r.setColor(t.Accent)
		} else {
			r.setColor(t.Text)
		}
		r.pdf.SetXY(t.MarginL, r.y)
		r.pdf.Cell(nil, proj.Name)
		if proj.URL != "" {
			tw, _ := r.pdf.MeasureTextWidth(proj.Name)
			r.pdf.AddExternalLink(proj.URL, t.MarginL, r.y-1, tw, 10)
		}

		if proj.Status != "" {
			r.pdf.SetFont("Inter", "", t.FontSizeSmall)
			r.setColor(t.Muted)
			tw, _ := r.pdf.MeasureTextWidth(proj.Status)
			r.pdf.SetXY(t.MarginL+colW-tw, r.y+0.5)
			r.pdf.Cell(nil, proj.Status)
		}
		r.y += 11

		if proj.Description != "" {
			r.pdf.SetFont("Inter", "", t.FontSizeBody)
			r.setColor(t.Muted)
			r.wrapText(proj.Description, t.MarginL, colW, 10)
			r.y += 1
		}

		if len(proj.Technologies) > 0 {
			r.pdf.SetFont("Inter", "", t.FontSizeTag)
			r.setColor(t.Accent)
			r.pdf.SetXY(t.MarginL, r.y)
			r.pdf.Cell(nil, strings.Join(proj.Technologies, "  ·  "))
			r.y += 10
		}

		r.y += 4
	}
}
