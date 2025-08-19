import React, { useState, useEffect } from 'react';
import './AdvancedSearch.css';

const AdvancedSearch = ({ repos, onFilter, className = '' }) => {
  const [filters, setFilters] = useState({
    searchTerm: '',
    tags: [],
    sortBy: 'recent',
    isPublic: 'all',
    starCount: 'all',
    dateRange: 'all'
  });

  const [availableTags, setAvailableTags] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Extract unique tags from all repositories
    const allTags = repos.flatMap(repo => repo.tags || []);
    const uniqueTags = [...new Set(allTags)].filter(tag => tag.trim().length > 0);
    setAvailableTags(uniqueTags.sort());
  }, [repos]);

  useEffect(() => {
    // Apply filters whenever filters change
    applyFilters();
  }, [filters, repos]);

  const applyFilters = () => {
    let filteredRepos = [...repos];

    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filteredRepos = filteredRepos.filter(repo =>
        repo.name.toLowerCase().includes(searchLower) ||
        repo.description.toLowerCase().includes(searchLower) ||
        (repo.tags && repo.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filteredRepos = filteredRepos.filter(repo =>
        repo.tags && filters.tags.every(tag => repo.tags.includes(tag))
      );
    }

    // Public/Private filter
    if (filters.isPublic !== 'all') {
      filteredRepos = filteredRepos.filter(repo =>
        repo.is_public === (filters.isPublic === 'public')
      );
    }

    // Star count filter
    if (filters.starCount !== 'all') {
      const starCountRanges = {
        'none': (stars) => stars === 0,
        'low': (stars) => stars >= 1 && stars <= 5,
        'medium': (stars) => stars >= 6 && stars <= 20,
        'high': (stars) => stars > 20
      };
      filteredRepos = filteredRepos.filter(repo =>
        starCountRanges[filters.starCount](repo.star_count || 0)
      );
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const dateRanges = {
        'today': 1,
        'week': 7,
        'month': 30,
        'year': 365
      };
      const daysAgo = dateRanges[filters.dateRange];
      const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      
      filteredRepos = filteredRepos.filter(repo =>
        new Date(repo.created_at) >= cutoffDate
      );
    }

    // Sort results
    filteredRepos.sort((a, b) => {
      switch (filters.sortBy) {
        case 'recent':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'stars':
          return (b.star_count || 0) - (a.star_count || 0);
        default:
          return 0;
      }
    });

    onFilter(filteredRepos);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleTagToggle = (tag) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      tags: [],
      sortBy: 'recent',
      isPublic: 'all',
      starCount: 'all',
      dateRange: 'all'
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.tags.length > 0) count++;
    if (filters.isPublic !== 'all') count++;
    if (filters.starCount !== 'all') count++;
    if (filters.dateRange !== 'all') count++;
    return count;
  };

  return (
    <div className={`advanced-search ${className}`}>
      <div className="search-header">
        <div className="search-main">
          <input
            type="text"
            placeholder="Search repositories by name, description, or tags..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            className="search-input"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
            title="Advanced Filters"
          >
            🔍 Filters
            {getActiveFilterCount() > 0 && (
              <span className="filter-badge">{getActiveFilterCount()}</span>
            )}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="filters-panel">
          {/* Sort By */}
          <div className="filter-group">
            <label>Sort by:</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A-Z)</option>
              <option value="stars">Most Stars</option>
            </select>
          </div>

          {/* Visibility */}
          <div className="filter-group">
            <label>Visibility:</label>
            <select
              value={filters.isPublic}
              onChange={(e) => handleFilterChange('isPublic', e.target.value)}
            >
              <option value="all">All Repositories</option>
              <option value="public">Public Only</option>
              <option value="private">Private Only</option>
            </select>
          </div>

          {/* Star Count */}
          <div className="filter-group">
            <label>Stars:</label>
            <select
              value={filters.starCount}
              onChange={(e) => handleFilterChange('starCount', e.target.value)}
            >
              <option value="all">Any Stars</option>
              <option value="none">No Stars</option>
              <option value="low">1-5 Stars</option>
              <option value="medium">6-20 Stars</option>
              <option value="high">20+ Stars</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="filter-group">
            <label>Created:</label>
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            >
              <option value="all">Any Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>

          {/* Tags */}
          {availableTags.length > 0 && (
            <div className="filter-group tags-filter">
              <label>Tags:</label>
              <div className="tags-container">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`tag-button ${filters.tags.includes(tag) ? 'active' : ''}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          {getActiveFilterCount() > 0 && (
            <div className="filter-actions">
              <button onClick={clearFilters} className="clear-filters">
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;
