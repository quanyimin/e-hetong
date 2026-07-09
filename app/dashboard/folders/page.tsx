'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal';
import {
  Folder, FolderPlus, FolderOpen, FileText, Plus, MoreHorizontal, Edit3, Trash2,
  ChevronRight, Palette, Check, X,
} from 'lucide-react';

const FOLDER_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#64748b'];

const MOCK_FOLDERS = [
  { id: 'f1', name: '采购合同', color: '#6366f1', count: 5 },
  { id: 'f2', name: '租赁合同', color: '#22c55e', count: 3 },
  { id: 'f3', name: '劳动合同', color: '#f97316', count: 8 },
  { id: 'f4', name: '技术服务', color: '#06b6d4', count: 2 },
  { id: 'f5', name: '品牌授权', color: '#ec4899', count: 1 },
];

export default function FoldersPage() {
  const [folders, setFolders] = React.useState(MOCK_FOLDERS);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editFolder, setEditFolder] = React.useState<typeof MOCK_FOLDERS[0] | null>(null);
  const [newName, setNewName] = React.useState('');
  const [newColor, setNewColor] = React.useState(FOLDER_COLORS[0]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    setFolders((prev) => [...prev, { id: `f${Date.now()}`, name: newName, color: newColor, count: 0 }]);
    setNewName('');
    setShowCreateModal(false);
  };

  const handleEdit = () => {
    if (!editFolder || !newName.trim()) return;
    setFolders((prev) => prev.map((f) => f.id === editFolder.id ? { ...f, name: newName, color: newColor } : f));
    setShowEditModal(false);
  };

  const handleDelete = (id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">合同分类</h1>
          <p className="text-muted-foreground mt-1">用文件夹管理您的合同</p>
        </div>
        <Button onClick={() => { setNewName(''); setNewColor(FOLDER_COLORS[0]); setShowCreateModal(true); }}>
          <FolderPlus className="h-4 w-4 mr-2" />新建文件夹
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 全部合同入口 */}
        <Link href="/dashboard/contracts">
          <Card className="hover:shadow-md transition-all cursor-pointer group border-dashed">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <FolderOpen className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">全部合同</p>
                <p className="text-sm text-muted-foreground">{folders.reduce((s, f) => s + f.count, 0)} 份</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        {folders.map((folder) => (
          <Link key={folder.id} href={`/dashboard/contracts?folder=${folder.id}`}>
            <Card className="hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: folder.color + '20' }}>
                      <Folder className="h-6 w-6" style={{ color: folder.color }} />
                    </div>
                    <div>
                      <p className="font-medium">{folder.name}</p>
                      <p className="text-sm text-muted-foreground">{folder.count} 份合同</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.preventDefault(); setEditFolder(folder); setNewName(folder.name); setNewColor(folder.color); setShowEditModal(true); }}
                      className="p-1.5 rounded-md hover:bg-accent"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); handleDelete(folder.id); }}
                      className="p-1.5 rounded-md hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 新建弹窗 */}
      <Modal open={showCreateModal} onOpenChange={setShowCreateModal}>
        <ModalContent>
          <ModalHeader><ModalTitle>新建文件夹</ModalTitle></ModalHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>文件夹名称</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="例如：采购合同" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>颜色</Label>
              <div className="flex gap-2">
                {FOLDER_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`h-8 w-8 rounded-full transition-all ${newColor === color ? 'ring-2 ring-offset-2 scale-110' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewColor(color)}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>取消</Button>
              <Button onClick={handleCreate}>创建</Button>
            </div>
          </div>
        </ModalContent>
      </Modal>

      {/* 编辑弹窗 */}
      <Modal open={showEditModal} onOpenChange={setShowEditModal}>
        <ModalContent>
          <ModalHeader><ModalTitle>编辑文件夹</ModalTitle></ModalHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>文件夹名称</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>颜色</Label>
              <div className="flex gap-2">
                {FOLDER_COLORS.map((color) => (
                  <button key={color} className={`h-8 w-8 rounded-full transition-all ${newColor === color ? 'ring-2 ring-offset-2 scale-110' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewColor(color)} />
                ))}
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>取消</Button>
              <Button onClick={handleEdit}>保存</Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
