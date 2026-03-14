package pdf

import (
	"fmt"
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
