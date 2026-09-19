# 외부 라이브러리 고지

프로젝트 자체에는 현재 오픈소스 라이선스를 지정하지 않았습니다. 아래 외부 구성 요소에는 각 라이선스가 별도로 적용됩니다.

| 구성 요소 | 사용 버전 | 라이선스 / 고지 |
| --- | --- | --- |
| [Three.js](https://github.com/mrdoob/three.js) | 0.186.0 | MIT, three.js authors |
| [ws](https://github.com/websockets/ws) | 8.21.3 | MIT, 해당 패키지 LICENSE의 저작권자 |
| [Electron](https://github.com/electron/electron) | 44.4.3 | MIT 및 포함된 Chromium·Node.js 등의 별도 고지 |
| [@electron/packager](https://github.com/electron/packager) | 20.3.0 | BSD-2-Clause, 빌드 도구 |

정확한 의존성 버전과 설치 출처는 `package-lock.json`에 고정되어 있습니다. 각 패키지에 포함된 LICENSE 파일이 해당 버전의 기준입니다. 위 목록은 전이 의존성 전체의 라이선스 목록을 대신하지 않습니다.

Windows 배포 폴더에는 Electron의 `LICENSE`와 Chromium 관련 고지가 포함됩니다. 폴더 전체를 배포하고 이 파일들을 삭제하지 마세요. Three.js와 ws 등의 라이선스도 패키지와 함께 보존해야 합니다.

화면은 Google Fonts에서 Barlow Condensed와 Noto Sans KR을 요청할 수 있습니다. 폰트 파일은 이 소스 저장소에 복사하여 배포하지 않습니다. 연결되지 않으면 시스템 폰트를 사용합니다. 폰트를 직접 번들링할 때는 해당 폰트의 배포 라이선스도 함께 확인해야 합니다.

게임의 캐릭터·카트 모델과 합성 음악은 프로젝트 코드로 구성했습니다. 참고한 상용 게임의 로고·캐릭터 원본·음원 파일은 포함하지 않습니다.
