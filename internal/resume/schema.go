package resume

// Resume is the top-level structure representing the full CV.
type Resume struct {
	Personal       Personal       `yaml:"personal" json:"personal"`
	Experience     []Experience   `yaml:"experience" json:"experience"`
	Education      []Education    `yaml:"education" json:"education"`
	Skills         []SkillGroup   `yaml:"skills" json:"skills"`
	Certifications []Certification `yaml:"certifications" json:"certifications"`
	Languages      []Language     `yaml:"languages" json:"languages"`
	Projects       []Project      `yaml:"projects" json:"projects"`
	Layout         Layout         `yaml:"layout" json:"layout"`
	Meta           Meta           `yaml:"meta" json:"meta"`
}

// Layout controls which sections render, visual theming, and visualization style.
type Layout struct {
	Sections        []string `yaml:"sections" json:"sections,omitempty"`
	Accent          string   `yaml:"accent" json:"accent,omitempty"`
	ExperienceStyle string   `yaml:"experience" json:"experience,omitempty"`
	SkillsStyle     string   `yaml:"skills" json:"skills,omitempty"`
	Chat            bool     `yaml:"chat" json:"chat,omitempty"`
}

// DefaultSections returns the default section order.
func DefaultSections() []string {
	return []string{"experience", "education", "languages", "skills", "certifications", "projects"}
}

// HasSection returns true if the given section is in the layout's section list.
func (l Layout) HasSection(name string) bool {
	sections := l.Sections
	if len(sections) == 0 {
		sections = DefaultSections()
	}
	for _, s := range sections {
		if s == name {
			return true
		}
	}
	return false
}

type Personal struct {
	Name               string        `yaml:"name" json:"name"`
	Title              string        `yaml:"title" json:"title"`
	Bio                string        `yaml:"bio" json:"bio"`
	Location           string        `yaml:"location" json:"location,omitempty"`
	LocationVisibility string        `yaml:"location_visibility" json:"-"`
	Website            string        `yaml:"website" json:"website"`
	Links              []Link        `yaml:"links" json:"links"`
	Contact            []ContactInfo `yaml:"contact" json:"contact,omitempty"`
}

type Link struct {
	Platform string `yaml:"platform" json:"platform"`
	URL      string `yaml:"url" json:"url"`
}

type ContactInfo struct {
	Type       string `yaml:"type" json:"type"`
	Value      string `yaml:"value" json:"value"`
	Visibility string `yaml:"visibility" json:"visibility"`
}

type Experience struct {
	Company      string   `yaml:"company" json:"company"`
	URL          string   `yaml:"url" json:"url,omitempty"`
	Role         string   `yaml:"role" json:"role"`
	Start        string   `yaml:"start" json:"start"`
	End          *string  `yaml:"end" json:"end"`
	Location     string   `yaml:"location" json:"location"`
	Description  string   `yaml:"description" json:"description"`
	Highlights   []string `yaml:"highlights" json:"highlights"`
	Technologies []string `yaml:"technologies" json:"technologies"`
}

type Education struct {
	Institution string `yaml:"institution" json:"institution"`
	Degree      string `yaml:"degree" json:"degree"`
	Start       string `yaml:"start" json:"start"`
	End         string `yaml:"end" json:"end"`
	Location    string `yaml:"location" json:"location"`
	Notes       string `yaml:"notes" json:"notes,omitempty"`
}

type SkillGroup struct {
	Category string  `yaml:"category" json:"category"`
	Items    []Skill `yaml:"items" json:"items"`
}

type Skill struct {
	Name  string `yaml:"name" json:"name"`
	Level int    `yaml:"level" json:"level"`
}

type Certification struct {
	Name         string `yaml:"name" json:"name"`
	Issuer       string `yaml:"issuer" json:"issuer"`
	Date         string `yaml:"date" json:"date"`
	CredentialID string `yaml:"credential_id" json:"credential_id,omitempty"`
	URL          string `yaml:"url" json:"url,omitempty"`
	Source       string `yaml:"source" json:"source"`
}

type Language struct {
	Name        string `yaml:"name" json:"name"`
	Proficiency string `yaml:"proficiency" json:"proficiency"`
}

type Project struct {
	Name         string   `yaml:"name" json:"name"`
	Description  string   `yaml:"description" json:"description"`
	URL          string   `yaml:"url" json:"url,omitempty"`
	Technologies []string `yaml:"technologies" json:"technologies"`
	Status       string   `yaml:"status" json:"status"`
}

type Meta struct {
	LastUpdated string `yaml:"last_updated" json:"last_updated"`
	Version     string `yaml:"version" json:"version"`
}
