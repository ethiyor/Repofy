import React, { useState, useEffect } from 'react';
import './Analytics.css';

const Analytics = ({ repos, session }) => {
  const [analytics, setAnalytics] = useState({
    totalRepos: 0,
    totalStars: 0,
    mostPopularRepo: null,
    recentActivity: [],
    languageStats: {},
    monthlyGrowth: []
  });

  useEffect(() => {
    if (repos && repos.length > 0) {
      calculateAnalytics();
    }
  }, [repos]);

  const calculateAnalytics = () => {
    const totalRepos = repos.length;
    const totalStars = repos.reduce((sum, repo) => sum + (repo.star_count || 0), 0);
    
    // Find most popular repository
    const mostPopularRepo = repos.reduce((prev, current) => 
      (prev.star_count || 0) > (current.star_count || 0) ? prev : current
    );

    // Calculate language statistics from tags
    const languageStats = {};
    repos.forEach(repo => {
      if (repo.tags && Array.isArray(repo.tags)) {
        repo.tags.forEach(tag => {
          const language = tag.toLowerCase();
          // Filter for programming languages
          const programmingLanguages = ['javascript', 'python', 'java', 'typescript', 'react', 'node', 'html', 'css', 'sql', 'c++', 'c', 'go', 'rust', 'swift'];
          if (programmingLanguages.includes(language)) {
            languageStats[language] = (languageStats[language] || 0) + 1;
          }
        });
      }
    });

    // Calculate recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentActivity = repos
      .filter(repo => new Date(repo.created_at) > thirtyDaysAgo)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    // Calculate monthly growth
    const monthlyGrowth = calculateMonthlyGrowth(repos);

    setAnalytics({
      totalRepos,
      totalStars,
      mostPopularRepo,
      recentActivity,
      languageStats,
      monthlyGrowth
    });
  };

  const calculateMonthlyGrowth = (repos) => {
    const monthCounts = {};
    const currentDate = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[key] = 0;
    }

    repos.forEach(repo => {
      const date = new Date(repo.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthCounts.hasOwnProperty(key)) {
        monthCounts[key]++;
      }
    });

    return Object.entries(monthCounts).map(([month, count]) => ({
      month,
      count
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getTopLanguages = () => {
    return Object.entries(analytics.languageStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  };

  return (
    <div className="analytics-container">
      <h2>📊 Your Repository Analytics</h2>
      
      {/* Overview Cards */}
      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="card-icon">📚</div>
          <div className="card-content">
            <h3>{analytics.totalRepos}</h3>
            <p>Total Repositories</p>
          </div>
        </div>
        
        <div className="analytics-card">
          <div className="card-icon">⭐</div>
          <div className="card-content">
            <h3>{analytics.totalStars}</h3>
            <p>Total Stars</p>
          </div>
        </div>
        
        <div className="analytics-card">
          <div className="card-icon">🏆</div>
          <div className="card-content">
            <h3>{analytics.mostPopularRepo?.star_count || 0}</h3>
            <p>Most Popular Repo Stars</p>
            <small>{analytics.mostPopularRepo?.name}</small>
          </div>
        </div>
        
        <div className="analytics-card">
          <div className="card-icon">📈</div>
          <div className="card-content">
            <h3>{analytics.recentActivity.length}</h3>
            <p>Recent Activity (30 days)</p>
          </div>
        </div>
      </div>

      {/* Language Distribution */}
      {getTopLanguages().length > 0 && (
        <div className="analytics-section">
          <h3>🔧 Top Technologies</h3>
          <div className="language-stats">
            {getTopLanguages().map(([language, count]) => (
              <div key={language} className="language-item">
                <span className="language-name">{language}</span>
                <div className="language-bar">
                  <div 
                    className="language-fill" 
                    style={{ 
                      width: `${(count / analytics.totalRepos) * 100}%`,
                      backgroundColor: getLanguageColor(language)
                    }}
                  ></div>
                </div>
                <span className="language-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Growth Chart */}
      <div className="analytics-section">
        <h3>📊 Repository Growth (Last 6 Months)</h3>
        <div className="growth-chart">
          {analytics.monthlyGrowth.map(({ month, count }) => (
            <div key={month} className="month-bar">
              <div 
                className="bar-fill" 
                style={{ height: `${Math.max(count * 20, 5)}px` }}
                title={`${month}: ${count} repositories`}
              ></div>
              <span className="month-label">{month.split('-')[1]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {analytics.recentActivity.length > 0 && (
        <div className="analytics-section">
          <h3>🕒 Recent Activity</h3>
          <div className="activity-list">
            {analytics.recentActivity.map(repo => (
              <div key={repo.id} className="activity-item">
                <div className="activity-icon">📝</div>
                <div className="activity-content">
                  <strong>{repo.name}</strong>
                  <p>{repo.description}</p>
                  <small>Created {formatDate(repo.created_at)}</small>
                </div>
                <div className="activity-stats">
                  <span>⭐ {repo.star_count || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const getLanguageColor = (language) => {
  const colors = {
    javascript: '#f1e05a',
    python: '#3572a5',
    java: '#b07219',
    typescript: '#2b7489',
    react: '#61dafb',
    node: '#339933',
    html: '#e34c26',
    css: '#1572b6',
    sql: '#e38c00',
    'c++': '#f34b7d',
    c: '#555555',
    go: '#00add8',
    rust: '#dea584',
    swift: '#ffac45'
  };
  return colors[language.toLowerCase()] || '#6b7280';
};

export default Analytics;
