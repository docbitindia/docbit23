import React from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { Modal } from './Modal';
import { navigate } from '../router/useRoute';

export function UpgradePlanModal({open,onClose,title='Upgrade your plan',description='Move to a higher plan to unlock more capacity and collaboration.'}:{open:boolean;onClose:()=>void;title?:string;description?:string}){
 return <Modal open={open} onClose={onClose} title={title} description={description} size="sm" footer={<div className="flex justify-end gap-2"><button className="modal-cancel-button-lg" onClick={onClose}>Not now</button><button className="btn-primary" onClick={()=>{onClose();navigate('/plans')}}><Sparkles size={15}/>View plans <ArrowUpRight size={14}/></button></div>}>
  <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4"><p className="text-sm font-semibold text-slate-900">Need more room?</p><p className="mt-1 text-xs leading-5 text-slate-600">Upgrade to increase file size, saved files, projects, processing, storage or team seats.</p></div>
 </Modal>
}
