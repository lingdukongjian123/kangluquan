/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  History, 
  AlertCircle, 
  User, 
  PlusCircle, 
  X,
  MessageSquarePlus,
  ArrowRight,
  MapPin,
  Settings2,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Machine, Status } from './types';
import * as storage from './lib/storage';

// --- Components ---

const Badge = ({ status }: { status: Status }) => {
  const styles = {
    normal: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-red-100 text-red-700 border-red-200',
    in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
    completed: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  };

  const labels = {
    normal: '正常运行',
    pending: '待维修',
    in_progress: '维修中',
    completed: '已完成',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');
  const [workerName, setWorkerName] = useState('张工'); // Default worker name for demo
  
  // Modal states
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [modalType, setModalType] = useState<'report' | 'start' | 'complete' | 'history' | 'add' | 'edit' | 'edit_person' | null>(null);

  // Form states
  const [faultDesc, setFaultDesc] = useState('');
  const [repairContent, setRepairContent] = useState('');
  const [partsReplaced, setPartsReplaced] = useState('');
  const [noteText, setNoteText] = useState('');
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  // New/Edit Machine states
  const [newMachineId, setNewMachineId] = useState('');
  const [newCommunity, setNewCommunity] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newResponsiblePerson, setNewResponsiblePerson] = useState('');

  useEffect(() => {
    setMachines(storage.getMachines());
  }, []);

  const refreshData = () => {
    setMachines(storage.getMachines());
  };

  const filteredMachines = useMemo(() => {
    return machines
      .filter(m => {
        const matchesSearch = 
          m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.community.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' || m.currentStatus === filterStatus;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        // Sort pending and in_progress machines to the top
        const isAActive = a.currentStatus === 'pending' || a.currentStatus === 'in_progress';
        const isBActive = b.currentStatus === 'pending' || b.currentStatus === 'in_progress';
        
        if (isAActive && !isBActive) return -1;
        if (!isAActive && isBActive) return 1;
        
        // If both are active, prioritize pending over in_progress
        if (a.currentStatus === 'pending' && b.currentStatus === 'in_progress') return -1;
        if (a.currentStatus === 'in_progress' && b.currentStatus === 'pending') return 1;

        // Then sort by ID
        return a.id.localeCompare(b.id);
      });
  }, [machines, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    return {
      total: machines.length,
      pending: machines.filter(m => m.currentStatus === 'pending').length,
      inProgress: machines.filter(m => m.currentStatus === 'in_progress').length,
      completed: machines.filter(m => m.currentStatus === 'completed').length,
    };
  }, [machines]);

  const handleReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMachine && faultDesc) {
      storage.reportFault(selectedMachine.id, faultDesc, workerName);
      setFaultDesc('');
      setModalType(null);
      refreshData();
    }
  };

  const handleStart = () => {
    if (selectedMachine) {
      storage.startRepair(selectedMachine.id, workerName);
      setModalType(null);
      refreshData();
    }
  };

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMachine && repairContent) {
      storage.completeRepair(selectedMachine.id, repairContent, partsReplaced, workerName);
      setRepairContent('');
      setPartsReplaced('');
      setModalType(null);
      refreshData();
    }
  };

  const handleAddNote = (historyId: string) => {
    if (selectedMachine && noteText) {
      storage.addNote(selectedMachine.id, historyId, noteText);
      setNoteText('');
      setActiveHistoryId(null);
      refreshData();
      // Update the selected machine in state to show the new note in history
      const updated = storage.getMachines().find(m => m.id === selectedMachine.id);
      if (updated) setSelectedMachine(updated);
    }
  };

  const handleAddMachine = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      storage.addMachine({
        id: newMachineId,
        community: newCommunity,
        location: newLocation,
        currentStatus: 'normal',
        repairHistory: []
      });
      setNewMachineId('');
      setNewCommunity('');
      setNewLocation('');
      setModalType(null);
      refreshData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '添加失败');
    }
  };

  const handleEditMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMachine) {
      storage.updateMachineDetails(selectedMachine.id, newCommunity, newLocation);
      setModalType(null);
      refreshData();
    }
  };

  const handleEditPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMachine) {
      storage.updateResponsiblePerson(selectedMachine.id, newResponsiblePerson);
      setModalType(null);
      refreshData();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-200">
                <Wrench className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-gray-900">康鲁泉净水器维修管理系统</h1>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Water Purifier Maintenance Management</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => { setModalType('add'); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                <Plus size={18} /> 新增设备
              </button>
              
              <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-200">
                <User size={16} className="text-gray-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">当前操作人</span>
                  <input 
                    type="text" 
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    className="bg-transparent text-sm font-bold focus:outline-none w-24 text-gray-700"
                    placeholder="工人姓名"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: '全部设备', value: stats.total, icon: Filter, color: 'bg-gray-100 text-gray-600' },
            { label: '待维修', value: stats.pending, icon: AlertCircle, color: 'bg-amber-50 text-amber-600' },
            { label: '维修中', value: stats.inProgress, icon: Clock, color: 'bg-blue-50 text-blue-600' },
            { label: '已完成', value: stats.completed, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className={`p-3.5 rounded-2xl ${stat.color}`}>
                <stat.icon size={22} />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 font-black uppercase tracking-wide">{stat.label}</p>
                <p className="text-2xl font-black text-gray-900">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="搜索设备编号 (如 JSJ-001)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none shadow-sm font-medium"
            />
          </div>
          <div className="flex gap-1.5 bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm overflow-x-auto no-scrollbar">
            {(['all', 'pending', 'in_progress', 'completed', 'normal'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap uppercase tracking-wider ${
                  filterStatus === s 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                }`}
              >
                {s === 'all' ? '全部' : s === 'pending' ? '待维修' : s === 'in_progress' ? '维修中' : s === 'completed' ? '已完成' : '正常'}
              </button>
            ))}
          </div>
        </div>

        {/* Machine Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence mode="popLayout">
            {filteredMachines.map((machine) => (
              <motion.div
                key={machine.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`bg-white rounded-3xl border ${
                  machine.currentStatus === 'pending' ? 'border-red-500 ring-4 ring-red-50' : 'border-gray-100'
                } shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden group flex flex-col`}
              >
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex flex-col">
                      <span className="text-xl font-black text-gray-900 tracking-tight">{machine.id}</span>
                      <button 
                        onClick={() => { 
                          setSelectedMachine(machine); 
                          setNewCommunity(machine.community);
                          setNewLocation(machine.location);
                          setModalType('edit'); 
                        }}
                        className="text-[10px] text-blue-600 font-bold flex items-center gap-1 hover:underline mt-1"
                      >
                        <Settings2 size={10} /> 修改位置
                      </button>
                    </div>
                    <Badge status={machine.currentStatus} />
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 p-1 bg-gray-50 rounded-lg">
                        <MapPin size={14} className="text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">小区位置</p>
                        <p className="text-sm text-gray-700 font-bold leading-relaxed">
                          {machine.community} · {machine.location}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 p-1 bg-gray-50 rounded-lg">
                        <AlertCircle size={14} className="text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">最近故障</p>
                        <p className="text-sm text-gray-700 font-medium line-clamp-2 leading-relaxed">
                          {machine.lastFault || <span className="text-gray-300 italic font-normal">暂无故障记录</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-1 bg-gray-50 rounded-lg">
                        <Clock size={14} className="text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">最后维修</p>
                        <p className="text-xs text-gray-600 font-semibold">
                          {machine.lastRepairTime || '从未维修'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-1 bg-gray-50 rounded-lg">
                        <User size={14} className="text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">负责人</p>
                          <button 
                            onClick={() => {
                              setSelectedMachine(machine);
                              setNewResponsiblePerson(machine.lastRepairMan || '');
                              setModalType('edit_person');
                            }}
                            className="text-[10px] text-blue-600 font-bold hover:underline"
                          >
                            修改
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 font-semibold">
                          {machine.lastRepairMan || '无负责人'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50/50 border-t border-gray-100 grid grid-cols-2 gap-3">
                  {machine.currentStatus === 'normal' || machine.currentStatus === 'completed' ? (
                    <button 
                      onClick={() => { setSelectedMachine(machine); setModalType('report'); }}
                      className="flex items-center justify-center gap-2 py-2.5 bg-white text-amber-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-amber-50 transition-colors border border-amber-100 shadow-sm"
                    >
                      <PlusCircle size={16} /> 报修
                    </button>
                  ) : machine.currentStatus === 'pending' ? (
                    <button 
                      onClick={() => { setSelectedMachine(machine); setModalType('start'); }}
                      className="flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                    >
                      <Wrench size={16} /> 开始
                    </button>
                  ) : (
                    <button 
                      onClick={() => { setSelectedMachine(machine); setModalType('complete'); }}
                      className="flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
                    >
                      <CheckCircle2 size={16} /> 完成
                    </button>
                  )}
                  <button 
                    onClick={() => { setSelectedMachine(machine); setModalType('history'); }}
                    className="flex items-center justify-center gap-2 py-2.5 bg-white text-gray-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm"
                  >
                    <History size={16} /> 历史
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredMachines.length === 0 && (
          <div className="text-center py-24">
            <div className="bg-gray-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Search className="text-gray-300" size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">未找到相关设备</h3>
            <p className="text-gray-400 font-medium">请尝试更换搜索词或筛选条件</p>
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {/* Report Fault Modal */}
        {modalType === 'report' && selectedMachine && (
          <Modal isOpen={true} onClose={() => setModalType(null)} title={`设备报修 - ${selectedMachine.id}`}>
            <form onSubmit={handleReport} className="space-y-6">
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">故障现象描述</label>
                <textarea 
                  required
                  value={faultDesc}
                  onChange={(e) => setFaultDesc(e.target.value)}
                  placeholder="请详细描述故障情况，例如：不出水、漏水、噪音大等..."
                  className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none h-40 resize-none font-medium transition-all"
                />
              </div>
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-xl border border-gray-200">
                    <User size={18} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase">报修人</p>
                    <p className="text-sm font-bold text-gray-700">{workerName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-black uppercase">日期</p>
                  <p className="text-sm font-bold text-gray-700">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98]"
              >
                提交报修单
              </button>
            </form>
          </Modal>
        )}

        {/* Start Repair Modal */}
        {modalType === 'start' && selectedMachine && (
          <Modal isOpen={true} onClose={() => setModalType(null)} title={`确认开始维修 - ${selectedMachine.id}`}>
            <div className="space-y-8">
              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <AlertCircle size={80} className="text-amber-600" />
                </div>
                <h4 className="text-[11px] font-black text-amber-600 uppercase tracking-wider mb-2">当前故障描述:</h4>
                <p className="text-lg font-bold text-amber-900 leading-relaxed">{selectedMachine.lastFault}</p>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-500 text-sm font-medium leading-relaxed">
                  点击下方按钮将设备状态更新为 <span className="text-blue-600 font-bold">“维修中”</span>。系统将自动记录您的姓名和当前时间作为开始维修的凭证。
                </p>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <User size={18} className="text-gray-400" />
                  <span className="text-sm font-bold text-gray-600">操作人: {workerName}</span>
                </div>
              </div>

              <button 
                onClick={handleStart}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98]"
              >
                确认开始维修
              </button>
            </div>
          </Modal>
        )}

        {/* Complete Repair Modal */}
        {modalType === 'complete' && selectedMachine && (
          <Modal isOpen={true} onClose={() => setModalType(null)} title={`完成维修 - ${selectedMachine.id}`}>
            <form onSubmit={handleComplete} className="space-y-6">
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">维修内容总结</label>
                <textarea 
                  required
                  value={repairContent}
                  onChange={(e) => setRepairContent(e.target.value)}
                  placeholder="请详细描述维修过程和最终结果..."
                  className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none h-32 resize-none font-medium transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">更换零件 (可选)</label>
                <input 
                  type="text"
                  value={partsReplaced}
                  onChange={(e) => setPartsReplaced(e.target.value)}
                  placeholder="如: PP棉滤芯, 增压泵, 止逆阀..."
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-medium transition-all"
                />
              </div>
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <User size={18} className="text-gray-400" />
                    <span className="text-sm font-bold text-gray-600">维修人: {workerName}</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">完成时间将自动记录为当前时间</p>
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-[0.98]"
              >
                确认完成并存档
              </button>
            </form>
          </Modal>
        )}

        {/* History Modal */}
        {modalType === 'history' && selectedMachine && (
          <Modal isOpen={true} onClose={() => setModalType(null)} title={`维修历史档案 - ${selectedMachine.id}`}>
            <div className="space-y-8 pb-4">
              {selectedMachine.repairHistory.length === 0 ? (
                <div className="text-center py-16">
                  <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="text-gray-200" size={40} />
                  </div>
                  <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">暂无历史维修记录</p>
                </div>
              ) : (
                selectedMachine.repairHistory.map((item, idx) => (
                  <div key={item.id} className="relative pl-8 border-l-4 border-gray-100 pb-10 last:pb-0">
                    <div className="absolute left-[-10px] top-0 w-4 h-4 rounded-full bg-white border-4 border-blue-500 shadow-sm" />
                    
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-5">
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">记录 #{selectedMachine.repairHistory.length - idx}</span>
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Clock size={12} />
                          <span className="text-[10px] font-bold uppercase">{item.reportTime}</span>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <section>
                          <h5 className="text-[10px] font-black text-gray-400 uppercase mb-2 flex items-center gap-1.5 tracking-wider">
                            <AlertCircle size={14} className="text-amber-500" /> 故障报修
                          </h5>
                          <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                            <p className="text-sm font-bold text-gray-800 leading-relaxed">{item.faultDesc}</p>
                          </div>
                          <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase">报修人: <span className="text-gray-600">{item.reportMan}</span></p>
                        </section>

                        {item.startTime && (
                          <section className="pt-5 border-t border-gray-100">
                            <h5 className="text-[10px] font-black text-gray-400 uppercase mb-3 flex items-center gap-1.5 tracking-wider">
                              <Wrench size={14} className="text-blue-500" /> 维修处理
                            </h5>
                            <div className="flex flex-wrap items-center gap-3 text-[10px] font-black text-gray-400 mb-4 uppercase">
                              <span className="bg-gray-100 px-2 py-1 rounded">开始: {item.startTime}</span>
                              <ArrowRight size={12} className="text-gray-300" />
                              <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-100">
                                {item.completeTime ? `完成: ${item.completeTime}` : '正在处理...'}
                              </span>
                            </div>
                            {item.repairContent && (
                              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <p className="text-sm text-gray-700 font-medium leading-relaxed">{item.repairContent}</p>
                              </div>
                            )}
                            {item.partsReplaced && (
                              <div className="mt-3 flex items-center gap-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase">更换零件:</span>
                                <span className="text-xs font-bold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">{item.partsReplaced}</span>
                              </div>
                            )}
                            <p className="text-[10px] text-gray-400 font-bold mt-3 uppercase">负责人: <span className="text-gray-600">{item.completeMan || item.startMan}</span></p>
                          </section>
                        )}

                        {/* Notes Section */}
                        <section className="pt-5 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1.5 tracking-wider">
                              <MessageSquarePlus size={14} className="text-indigo-400" /> 补充说明 (防扯皮)
                            </h5>
                            <button 
                              onClick={() => setActiveHistoryId(activeHistoryId === item.id ? null : item.id)}
                              className="text-[10px] text-blue-600 font-black uppercase tracking-widest hover:underline"
                            >
                              {activeHistoryId === item.id ? '取消' : '添加说明'}
                            </button>
                          </div>
                          
                          {item.notes && item.notes.length > 0 && (
                            <div className="space-y-2 mb-4">
                              {item.notes.map((note, nIdx) => (
                                <div key={nIdx} className="bg-indigo-50/30 px-3 py-2 rounded-xl border border-indigo-100/50 relative">
                                  <p className="text-[11px] text-indigo-900 font-medium leading-relaxed italic">
                                    {note}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {activeHistoryId === item.id && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex gap-2"
                            >
                              <input 
                                type="text"
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="输入补充信息或责任说明..."
                                className="flex-1 text-xs px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-medium transition-all"
                                autoFocus
                              />
                              <button 
                                onClick={() => handleAddNote(item.id)}
                                className="px-5 py-2 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
                              >
                                提交
                              </button>
                            </motion.div>
                          )}
                        </section>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Modal>
        )}

        {/* Add Machine Modal */}
        {modalType === 'add' && (
          <Modal isOpen={true} onClose={() => setModalType(null)} title="新增设备">
            <form onSubmit={handleAddMachine} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">设备编号</label>
                <input 
                  required
                  type="text"
                  value={newMachineId}
                  onChange={(e) => setNewMachineId(e.target.value)}
                  placeholder="如: JSJ-101"
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-medium transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">所属小区</label>
                <input 
                  required
                  type="text"
                  value={newCommunity}
                  onChange={(e) => setNewCommunity(e.target.value)}
                  placeholder="如: 领秀城"
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-medium transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">具体位置</label>
                <input 
                  required
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="如: 12号楼东侧"
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-medium transition-all"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98]"
              >
                确认添加
              </button>
            </form>
          </Modal>
        )}

        {/* Edit Machine Modal */}
        {modalType === 'edit' && selectedMachine && (
          <Modal isOpen={true} onClose={() => setModalType(null)} title={`修改位置 - ${selectedMachine.id}`}>
            <form onSubmit={handleEditMachine} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">所属小区</label>
                <input 
                  required
                  type="text"
                  value={newCommunity}
                  onChange={(e) => setNewCommunity(e.target.value)}
                  placeholder="如: 领秀城"
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-medium transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">具体位置</label>
                <input 
                  required
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="如: 12号楼东侧"
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-medium transition-all"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98]"
              >
                保存修改
              </button>
            </form>
          </Modal>
        )}

        {/* Edit Person Modal */}
        {modalType === 'edit_person' && selectedMachine && (
          <Modal isOpen={true} onClose={() => setModalType(null)} title={`修改负责人 - ${selectedMachine.id}`}>
            <form onSubmit={handleEditPerson} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">负责人姓名</label>
                <input 
                  required
                  type="text"
                  value={newResponsiblePerson}
                  onChange={(e) => setNewResponsiblePerson(e.target.value)}
                  placeholder="请输入负责人姓名..."
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-medium transition-all"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98]"
              >
                保存修改
              </button>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center border-t border-gray-100 mt-12">
        <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">系统运行正常 · 数据已加密存储</span>
        </div>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">© 2026 康鲁泉净水器维修管理系统 · 历下区技术支持</p>
        <div className="flex justify-center gap-6 mt-4">
          <span className="text-[10px] text-gray-300 font-bold uppercase tracking-tighter">Version 1.0.8</span>
          <span className="text-[10px] text-gray-300 font-bold uppercase tracking-tighter">LocalStorage Persistence</span>
        </div>
      </footer>
    </div>
  );
}
