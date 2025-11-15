# Fix SSH Frequent Disconnections

## Problem
SSH connections are dropping frequently, likely due to:
- Network timeouts (routers/firewalls closing idle connections)
- Server-side SSH timeout settings
- No keep-alive packets being sent

## Solution Applied on Server
✅ Created `/home/htmaldives/.ssh/config` with keep-alive settings

## ⚠️ IMPORTANT: You Need to Configure Your CLIENT (Your Computer)

Since you're connecting TO this server FROM another computer, you need to add the same settings on **YOUR COMPUTER** (the one you use to connect):

### For Windows (using PowerShell or Git Bash):
1. Navigate to: `C:\Users\YourUsername\.ssh\`
2. Create or edit `config` file (no extension)
3. Add these lines:
```
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
    TCPKeepAlive yes
    ConnectTimeout 10
```

### For Mac/Linux:
1. Navigate to: `~/.ssh/`
2. Create or edit `config` file
3. Add these lines:
```
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
    TCPKeepAlive yes
    ConnectTimeout 10
    ControlMaster auto
    ControlPath ~/.ssh/control-%h-%p-%r
    ControlPersist 10m
```

4. Set permissions: `chmod 600 ~/.ssh/config`

### For VS Code Remote SSH:
VS Code has its own SSH config. Add these settings to your client's `~/.ssh/config`:
```
Host htmaldives
    HostName 50.6.203.46
    User your_username
    ServerAliveInterval 60
    ServerAliveCountMax 3
    TCPKeepAlive yes
```

## Additional Server-Side Fix (Requires Root)
If you have root access, you can also configure the SSH server:

Edit `/etc/ssh/sshd_config`:
```bash
ClientAliveInterval 60
ClientAliveCountMax 3
TCPKeepAlive yes
```

Then restart SSH service:
```bash
sudo systemctl restart sshd
```

## What These Settings Do:
- **ServerAliveInterval 60**: Sends a keep-alive packet every 60 seconds
- **ServerAliveCountMax 3**: Disconnects only after 3 failed keep-alive attempts
- **TCPKeepAlive**: Uses TCP keep-alive at the network level
- **ControlMaster**: Reuses SSH connections (faster reconnection)

## Test the Fix
After adding the config on your client, reconnect via SSH. The connection should stay alive much longer!

