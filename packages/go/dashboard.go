package reqlog

import (
	"embed"
	"io/fs"
)

//go:embed dashboard_dist/*
var dashboardFiles embed.FS

func getDashboardFS() fs.FS {
	sub, err := fs.Sub(dashboardFiles, "dashboard_dist")
	if err != nil {
		return nil
	}
	return sub
}
