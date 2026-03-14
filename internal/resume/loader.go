package resume

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

// Load reads and parses a resume YAML file.
func Load(path string) (*Resume, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading resume file: %w", err)
	}

	var r Resume
	if err := yaml.Unmarshal(data, &r); err != nil {
		return nil, fmt.Errorf("parsing resume YAML: %w", err)
	}

	if err := validate(&r); err != nil {
		return nil, fmt.Errorf("validating resume: %w", err)
	}

	return &r, nil
}

func validate(r *Resume) error {
	if r.Personal.Name == "" {
		return fmt.Errorf("personal.name is required")
	}
	if r.Personal.Title == "" {
		return fmt.Errorf("personal.title is required")
	}
	if len(r.Experience) == 0 {
		return fmt.Errorf("at least one experience entry is required")
	}
	for i, exp := range r.Experience {
		if exp.Company == "" {
			return fmt.Errorf("experience[%d].company is required", i)
		}
		if exp.Role == "" {
			return fmt.Errorf("experience[%d].role is required", i)
		}
		if exp.Start == "" {
			return fmt.Errorf("experience[%d].start is required", i)
		}
	}
	for i, skill := range r.Skills {
		if skill.Category == "" {
			return fmt.Errorf("skills[%d].category is required", i)
		}
		for j, item := range skill.Items {
			if item.Level < 0 || item.Level > 100 {
				return fmt.Errorf("skills[%d].items[%d].level must be 0-100", i, j)
			}
		}
	}
	return nil
}
