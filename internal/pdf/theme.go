package pdf

// Color represents an RGB color.
type Color struct {
	R, G, B uint8
}

// Theme holds all visual constants for PDF rendering.
type Theme struct {
	Accent  Color
	Text    Color
	Muted   Color
	Border  Color
	TagBg   Color

	PageW float64
	PageH float64

	MarginL float64
	MarginR float64
	MarginT float64
	MarginB float64

	FontSizeName     float64
	FontSizeTitle    float64
	FontSizeBio      float64
	FontSizeBody     float64
	FontSizeSmall    float64
	FontSizeTag      float64
	FontSizeSection  float64
	FontSizePageNum  float64

	LineHeightBio    float64
	LineHeightBody   float64
}

// ColW returns the usable column width (page minus margins).
func (t Theme) ColW() float64 {
	return t.PageW - t.MarginL - t.MarginR
}

// DefaultTheme returns the standard Semblant PDF theme.
func DefaultTheme() Theme {
	return Theme{
		Accent: Color{8, 145, 178},
		Text:   Color{35, 35, 38},
		Muted:  Color{110, 110, 118},
		Border: Color{215, 215, 220},
		TagBg:  Color{237, 247, 250},

		PageW: 595.28,
		PageH: 841.89,

		MarginL: 42.0,
		MarginR: 42.0,
		MarginT: 42.0,
		MarginB: 42.0,

		FontSizeName:    22,
		FontSizeTitle:   11,
		FontSizeBio:     8.5,
		FontSizeBody:    7.5,
		FontSizeSmall:   6.5,
		FontSizeTag:     6.5,
		FontSizeSection: 7,
		FontSizePageNum: 6.5,

		LineHeightBio:  12,
		LineHeightBody: 10.5,
	}
}
