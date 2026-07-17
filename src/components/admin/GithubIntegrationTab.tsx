import React, { useState, useEffect } from 'react';
import { Github, Key, CheckCircle, ExternalLink, UploadCloud, RefreshCcw } from 'lucide-react';
import { saveGithubConfig, getGithubConfig, removeGithubConfig } from '../../lib/firebase';

export function GithubIntegrationTab() {
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [githubUser, setGithubUser] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  // Load persisted config on mount
  useEffect(() => {
    const loadConfig = async () => {
      const config = await getGithubConfig();
      if (config) {
        setGithubToken(config.token);
        setGithubUser(config.user);
      }
    };
    loadConfig();
  }, []);

  // Handle postMessage from the OAuth popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'github') {
        const token = event.data.access_token;
        if (token) {
          setGithubToken(token);
          fetchGithubProfile(token);
        } else {
          setError('No access token received from GitHub.');
        }
        setIsConnecting(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchGithubProfile = async (token: string) => {
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setGithubUser(data);
        await saveGithubConfig(token, data);
      } else {
        setError('Failed to fetch GitHub profile with token.');
      }
    } catch (err) {
      console.error(err);
      setError('Error communicating with GitHub API.');
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      // Fetch the auth URL from our backend
      const res = await fetch('/api/auth/github/url');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get GitHub Auth URL');
      }
      
      const { url } = await res.json();
      
      // Open popup with the provider's OAuth URL directly
      const authWindow = window.open(
        url,
        'github_oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        setIsConnecting(false);
        setError('Popup was blocked by your browser. Please allow popups and try again.');
      }
    } catch (err: any) {
      console.error('GitHub Connect Error:', err);
      setError(err.message || 'Failed to initialize connection.');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await removeGithubConfig();
    setGithubToken(null);
    setGithubUser(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900">
            <Github className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 text-lg">GitHub Integration</h3>
            <p className="text-xs text-zinc-500">Connect your GitHub account to enable repository access and automation.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {!githubToken ? (
            <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
              <Github className="h-10 w-10 text-zinc-400" />
              <div>
                <h4 className="font-bold text-zinc-800">Not Connected</h4>
                <p className="text-sm text-zinc-500 mt-1 max-w-sm">
                  Click below to authorize the application to access your GitHub repositories.
                </p>
              </div>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="mt-2 bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
              >
                {isConnecting ? (
                  <>Connecting...</>
                ) : (
                  <>
                    <Github className="h-4 w-4" />
                    Connect GitHub
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  {githubUser?.avatar_url ? (
                    <img 
                      src={githubUser.avatar_url} 
                      alt="Avatar" 
                      className="w-12 h-12 rounded-full border-2 border-emerald-500"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold">
                      {githubUser?.login?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-emerald-900 text-lg flex items-center gap-2">
                      {githubUser?.name || githubUser?.login || 'Connected User'}
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </h4>
                    <p className="text-sm text-emerald-700 font-mono mt-0.5">
                      @{githubUser?.login || 'unknown'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-emerald-200/50 flex gap-4">
                <div className="bg-white/60 p-3 rounded-lg flex-1">
                  <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Public Repos</p>
                  <p className="text-lg font-black text-emerald-900">{githubUser?.public_repos || 0}</p>
                </div>
                <div className="bg-white/60 p-3 rounded-lg flex-1">
                  <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Followers</p>
                  <p className="text-lg font-black text-emerald-900">{githubUser?.followers || 0}</p>
                </div>
                <div className="bg-white/60 p-3 rounded-lg flex-1">
                  <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Following</p>
                  <p className="text-lg font-black text-emerald-900">{githubUser?.following || 0}</p>
                </div>
              </div>
            </div>
          )}

          {githubToken && (
            <div className="space-y-6">
              <AutoSyncSettings token={githubToken} />
              <ExportToGithub token={githubToken} />
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800">
            <h5 className="font-bold mb-2 flex items-center gap-1.5">
              <ExternalLink className="h-4 w-4" />
              Setup Instructions
            </h5>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Register an OAuth App in GitHub Developer Settings.</li>
              <li>Set the Authorization callback URL to: <br/><code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs select-all">{window.location.origin}/auth/github/callback</code></li>
              <li>Add <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs">GITHUB_CLIENT_ID</code> and <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs">GITHUB_CLIENT_SECRET</code> to your AI Studio Secrets.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportToGithub({ token }: { token: string }) {
  const [repoName, setRepoName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  // New States for Repo Management/Updating
  const [mode, setMode] = useState<'create' | 'update'>('create');
  const [userRepos, setUserRepos] = useState<any[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);

  const fetchUserRepos = async () => {
    setIsLoadingRepos(true);
    setError('');
    try {
      const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Farmers-Gate-App'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUserRepos(Array.isArray(data) ? data : []);
      } else {
        const errData = await res.json().catch(() => ({}));
        console.warn('Failed to fetch repos from GitHub:', errData);
      }
    } catch (err) {
      console.error('Failed to fetch repos:', err);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUserRepos();
    }
  }, [token]);

  const handleExport = async () => {
    if (!repoName.trim()) {
      setError('Please select or enter a repository name');
      return;
    }
    
    setIsExporting(true);
    setError('');
    setSuccessUrl(null);

    try {
      const res = await fetch('/api/auth/github/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, repoName: repoName.trim(), isPrivate })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to export');
      }
      
      setSuccessUrl(data.url);
      // Refresh repo list if we created/updated a repository
      fetchUserRepos();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRepoSelect = (selectedName: string) => {
    setRepoName(selectedName);
    const selected = userRepos.find(r => r.name === selectedName);
    if (selected) {
      setIsPrivate(selected.private);
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Github className="w-32 h-32" />
      </div>
      
      <div className="relative">
        <h4 className="font-bold text-zinc-900 text-lg mb-1 flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-zinc-700" />
          Export Source Code to GitHub
        </h4>
        <p className="text-xs text-zinc-500 mb-6 max-w-md">
          Push the entire codebase of this application directly to your GitHub account. 
          If the repository already exists, it will be forcefully updated.
        </p>

        {/* Mode Toggle Tabs */}
        <div className="flex border-b border-zinc-200 mb-6 max-w-md">
          <button
            type="button"
            onClick={() => {
              setMode('create');
              setRepoName('');
              setIsPrivate(false);
              setError('');
            }}
            className={`flex-1 pb-2 text-sm font-semibold transition-colors border-b-2 cursor-pointer text-center ${
              mode === 'create'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Create New Repo
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('update');
              setRepoName('');
              setError('');
              fetchUserRepos();
            }}
            className={`flex-1 pb-2 text-sm font-semibold transition-colors border-b-2 cursor-pointer text-center ${
              mode === 'update'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Update Existing Repo
          </button>
        </div>

        <div className="space-y-4 max-w-md">
          {error && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
              {error}
            </div>
          )}
          
          {successUrl && (
            <div className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle className="h-4 w-4" />
                Successfully Exported!
              </div>
              <a 
                href={successUrl} 
                target="_blank" 
                rel="noreferrer"
                className="text-emerald-600 underline hover:text-emerald-800 break-all flex items-center gap-1"
              >
                {successUrl}
                <ExternalLink className="h-3 w-3 inline" />
              </a>
            </div>
          )}

          {mode === 'create' ? (
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">New Repository Name</label>
              <input 
                type="text" 
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="e.g. farmers-gate-app"
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-zinc-700">Select Existing Repository</label>
                <button
                  type="button"
                  onClick={fetchUserRepos}
                  disabled={isLoadingRepos}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCcw className={`h-3 w-3 ${isLoadingRepos ? 'animate-spin' : ''}`} />
                  Refresh List
                </button>
              </div>

              {isLoadingRepos ? (
                <div className="py-3 text-center border border-zinc-200 rounded-lg text-xs text-zinc-500">
                  Loading repositories from GitHub...
                </div>
              ) : userRepos.length === 0 ? (
                <div className="py-3 text-center border border-zinc-200 rounded-lg text-xs text-zinc-500">
                  No repositories found. Create one first or check permissions.
                </div>
              ) : (
                <select
                  value={repoName}
                  onChange={(e) => handleRepoSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                >
                  <option value="">-- Choose Repository to Update --</option>
                  {userRepos.map((repo) => (
                    <option key={repo.id} value={repo.name}>
                      {repo.name} ({repo.private ? 'Private' : 'Public'})
                    </option>
                  ))}
                </select>
              )}

              {repoName && (
                <div className="text-xs text-zinc-500 bg-zinc-50 p-2 rounded border border-zinc-150">
                  Selected Repository: <span className="font-semibold text-zinc-800">{repoName}</span>
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="private-repo"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              disabled={mode === 'update'} // Repo visibility can't be updated this way normally
              className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
            />
            <label 
              htmlFor="private-repo" 
              className={`text-sm text-zinc-700 cursor-pointer ${mode === 'update' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Create/Keep as private repository
            </label>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting || !repoName.trim()}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isExporting ? (
              mode === 'create' ? 'Creating and Pushing...' : 'Updating Repository...'
            ) : (
              <>
                <UploadCloud className="h-4 w-4" />
                {mode === 'create' ? 'Push to New GitHub Repo' : 'Force Push Update to Repo'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function AutoSyncSettings({ token }: { token: string }) {
  const [repoName, setRepoName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/auth/github/auto-sync')
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setIsEnabled(data.enabled);
          setRepoName(data.repoName || '');
          setIsPrivate(data.isPrivate || false);
        }
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    if (isEnabled && !repoName.trim()) {
      setMessage('Please provide a repository name');
      return;
    }
    
    setIsSaving(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/auth/github/auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: isEnabled,
          repoName: repoName.trim(),
          isPrivate,
          token // Update token since they are connected
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage(isEnabled ? 'Auto-sync enabled successfully.' : 'Auto-sync disabled.');
      } else {
        setMessage(data.error || 'Failed to save settings.');
      }
    } catch (e) {
      setMessage('Network error.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <RefreshCcw className="h-5 w-5 text-emerald-600" />
        <h4 className="font-bold text-zinc-900 text-lg">Continuous Auto-Sync</h4>
      </div>
      <p className="text-xs text-zinc-500 mb-6">
        Automatically push code to GitHub every time you make changes to the app or increment the version.
      </p>
      
      <div className="space-y-4 max-w-md">
        {message && (
          <div className="text-xs bg-zinc-100 p-2 rounded font-medium border border-zinc-200">
            {message}
          </div>
        )}
        
        <div className="flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-lg">
          <span className="text-sm font-bold text-zinc-700">Enable Auto-Sync</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
            />
            <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>
        
        {isEnabled && (
          <div className="bg-white p-4 border border-zinc-200 rounded-lg space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Target Repository</label>
              <input 
                type="text" 
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="e.g. auto-farmers-gate"
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="private-repo-sync"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="private-repo-sync" className="text-sm text-zinc-700 cursor-pointer">
                Private repository
              </label>
            </div>
          </div>
        )}
        
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
