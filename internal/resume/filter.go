package resume

// FilterPublic returns a copy of the resume with private fields stripped.
// Default-deny: only explicitly public data passes through.
func FilterPublic(r *Resume) *Resume {
	filtered := *r

	// Deep copy personal to avoid shared slice mutation
	p := r.Personal
	filtered.Personal = p

	// Filter contact info — only keep non-private entries
	publicContacts := make([]ContactInfo, 0)
	for _, c := range r.Personal.Contact {
		if c.Visibility != "private" {
			publicContacts = append(publicContacts, c)
		}
	}
	filtered.Personal.Contact = publicContacts

	// Strip location if marked private
	if r.Personal.LocationVisibility == "private" {
		filtered.Personal.Location = ""
	}

	// Strip LocationVisibility from output (internal field)
	filtered.Personal.LocationVisibility = ""

	return &filtered
}
