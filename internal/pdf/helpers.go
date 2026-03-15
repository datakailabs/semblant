package pdf

import (
	"fmt"
	"strconv"
	"strings"
)

func formatDateRange(start string, end *string) string {
	s := formatPDFDate(start)
	e := "Present"
	if end != nil {
		e = formatPDFDate(*end)
	}
	return s + " — " + e
}

func formatPDFDate(d string) string {
	if d == "" {
		return ""
	}
	parts := strings.Split(d, "-")
	if len(parts) == 1 {
		return parts[0]
	}
	months := []string{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
	m := 0
	fmt.Sscanf(parts[1], "%d", &m)
	if m >= 1 && m <= 12 {
		return months[m-1] + " " + parts[0]
	}
	return d
}

func parseHexColor(hex string) (Color, bool) {
	hex = strings.TrimPrefix(hex, "#")
	if len(hex) != 6 {
		return Color{}, false
	}
	r, err1 := strconv.ParseUint(hex[0:2], 16, 8)
	g, err2 := strconv.ParseUint(hex[2:4], 16, 8)
	b, err3 := strconv.ParseUint(hex[4:6], 16, 8)
	if err1 != nil || err2 != nil || err3 != nil {
		return Color{}, false
	}
	return Color{uint8(r), uint8(g), uint8(b)}, true
}
