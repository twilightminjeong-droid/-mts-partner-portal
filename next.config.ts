import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 모든 화면이 로그인 세션·DB를 요청 시점에 읽으므로 정적 셸 사전 렌더링을 쓰지 않는다
  cacheComponents: false,
  experimental: {
    // 첨부파일 한도(파일당 20MB, 요청당 50MB, lib/attachment-kinds.ts) + multipart 여유분.
    // proxy 한도가 더 작으면 본문이 오류 없이 잘려서 파일이 깨진 채 저장된다
    serverActions: { bodySizeLimit: "51mb" },
    proxyClientMaxBodySize: "51mb",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
