import { packager } from '@electron/packager';
const paths = await packager({
  dir: '.', out: 'dist', name: 'Neon Apex', platform: 'win32', arch: 'x64',
  overwrite: true, asar: true, prune: true, executableName: 'NeonApex',
  ignore: [/^\/dist(?:\/|$)/, /^\/\.npm-cache(?:\/|$)/, /^\/\.runtime(?:\/|$)/, /^\/\.env(?:\.|$)/, /^\/\.npmrc$/, /^\/tests(?:\/|$)/, /^\/scripts(?:\/|$)/, /^\/\.git(?:\/|$)/],
  win32metadata: { CompanyName: 'Neon Apex', FileDescription: 'Neon Apex Kart Racing', ProductName: 'Neon Apex' },
});
console.log('Windows app:', paths.join('\n'));
