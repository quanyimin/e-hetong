import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: '易合同 - AI智能合同管理系统',
    template: '%s | 易合同',
  },
  description:
    '易合同是一款面向小微企业的AI智能合同管理系统，支持多格式合同上传、AI自动解析、分类归档、到期提醒，助力企业高效管理合同全生命周期。',
  keywords: ['合同管理', 'AI合同解析', '智能合同', '合同管理系统', '小微企业', '电子合同'],
  authors: [{ name: '易合同团队' }],
  openGraph: {
    title: '易合同 - AI智能合同管理系统',
    description: '面向小微企业的合同全生命周期管理平台',
    type: 'website',
    locale: 'zh_CN',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            {/* 页脚 */}
            <footer className="border-t py-8 bg-muted/30">
              <div className="container">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl font-bold">
                        <span className="text-primary">易</span>合同
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      易合同 - AI智能合同管理系统，帮助小微企业高效管理合同全生命周期。
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">产品</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li><a href="/pricing" className="hover:text-primary transition-colors">定价方案</a></li>
                      <li><a href="#" className="hover:text-primary transition-colors">功能特性</a></li>
                      <li><a href="#" className="hover:text-primary transition-colors">更新日志</a></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">支持</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li><a href="#" className="hover:text-primary transition-colors">帮助中心</a></li>
                      <li><a href="#" className="hover:text-primary transition-colors">联系我们</a></li>
                      <li><a href="#" className="hover:text-primary transition-colors">服务协议</a></li>
                    </ul>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
                  &copy; {new Date().getFullYear()} 易合同. All rights reserved.
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
