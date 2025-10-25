import React from 'react';
import RepoList from '../RepoList';

export default function CommunityPage({
  session,
  userProfile,
  repos,
  setRepos,
  onStar,
  onDownload,
  onShowProfile,
  onShowUserProfile,
  onShowMyRepositories,
  onShowRepositoryDetail,
}) {
  return (
    <div className="community-section">
      <h3>🌐 Community Repositories</h3>
      <RepoList
        session={session}
        userProfile={userProfile}
        repos={repos}
        setRepos={setRepos}
        onStar={onStar}
        onDownload={onDownload}
        onShowProfile={onShowProfile}
        onShowUserProfile={onShowUserProfile}
        onShowMyRepositories={onShowMyRepositories}
        onShowRepositoryDetail={onShowRepositoryDetail}
      />
    </div>
  );
}
