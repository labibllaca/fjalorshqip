// ecosystem.config.js im Projekt-Root
module.exports = {
	apps: [{
		name: 'fjalor',
		script: 'serve',
		args: ['dist', '-l', '5187'],
		cwd: '/root/Projekte/fjalorshqip',
		env: { NODE_ENV: 'production' }
	}]
}
//pm2 start ecosystem.config.js
//pm2 sav
