const http = require('http');

const options = {
  hostname: 'localhost',
  port: 9092,
  path: '/npm-registry/expo-linking',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);

    const versions = Object.keys(json.versions || {});
    console.log('ALL_VERSIONS: ' + JSON.stringify(versions, null, 2));

    const v8x = versions.filter(v => v.startsWith('8.')).sort((a, b) => {
      const pa = a.split('.').map(Number);
      const pb = b.split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        if (pa[i] !== pb[i]) return pa[i] - pb[i];
      }
      return 0;
    });

    const latest8 = v8x[v8x.length - 1];
    const dist = json.versions[latest8] && json.versions[latest8].dist;

    console.log('\nLATEST_8X: ' + latest8);
    console.log('DIST: ' + JSON.stringify(dist, null, 2));
  });
});

req.on('error', e => console.error('ERROR: ' + e.message));
req.end();
