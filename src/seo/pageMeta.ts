export interface PageMetaEntry { path:string; title:string; description:string; robots?:string; sitemapPriority?:string; sitemapChangefreq?:string; }
const noindex='noindex, follow';
export const PAGE_META: Record<string,PageMetaEntry> = {
 '/':{path:'/',title:'DocBit — Data Preparation Tool for Excel, CSV & JSON',description:'Prepare Excel, CSV and JSON data with DocBit. Analyze, edit, filter, sort, calculate and export precise datasets.',sitemapPriority:'1.0',sitemapChangefreq:'weekly'},
 '/workspace':{path:'/workspace',title:'Workspace — DocBit',description:'Your DocBit workspace for uploads, projects, recent activity and saved data.',robots:noindex},
 '/projects':{path:'/projects',title:'Projects — DocBit',description:'Organize DocBit source files, edits and exports into persistent projects.',robots:noindex},
 '/team':{path:'/team',title:'Team — DocBit',description:'Manage project access, Editors and Users.',robots:noindex},
 '/profile':{path:'/profile',title:'Profile — DocBit',description:'Manage your DocBit account profile.',robots:noindex},
 '/settings':{path:'/settings',title:'Settings — DocBit',description:'Manage DocBit workspace and account settings.',robots:noindex},
 '/usage-plan':{path:'/usage-plan',title:'Usage & Billing — DocBit',description:'Track DocBit processing, storage and subscription usage.',robots:noindex},
 '/auth/login':{path:'/auth/login',title:'Log in — DocBit',description:'Log in to your DocBit workspace.',robots:noindex},
 '/auth/signup':{path:'/auth/signup',title:'Create your DocBit account',description:'Create a DocBit workspace for data preparation and projects.',robots:noindex},
 '/password/reset':{path:'/password/reset',title:'Reset your password — DocBit',description:'Reset your DocBit account password.',robots:noindex},
 '/plans':{path:'/plans',title:'Plans & Pricing — DocBit',description:'Compare DocBit Free, Starter, Pro and Pro Plus plans.',sitemapPriority:'0.8',sitemapChangefreq:'monthly'},
 '/about':{path:'/about',title:'About DocBit',description:'Learn about DocBit and its focused approach to structured data preparation.',sitemapPriority:'0.5',sitemapChangefreq:'monthly'},
 '/terms':{path:'/terms',title:'Terms & Conditions — DocBit',description:'DocBit terms and conditions.',sitemapPriority:'0.2',sitemapChangefreq:'yearly'},
 '/privacy':{path:'/privacy',title:'Privacy — DocBit',description:'How DocBit handles authentication, project data and uploaded files.',sitemapPriority:'0.3',sitemapChangefreq:'yearly'},
 '/documentation':{path:'/documentation',title:'Documentation — DocBit',description:'Learn how to upload, analyze, configure, edit, save and export data with DocBit.',sitemapPriority:'0.7',sitemapChangefreq:'monthly'},
 '/support':{path:'/support',title:'Support — DocBit',description:'Troubleshooting and support for DocBit data preparation workflows.',sitemapPriority:'0.4',sitemapChangefreq:'monthly'},
 '/analyzing':{path:'/analyzing',title:'Analyzing — DocBit',description:'Analyze an uploaded dataset before editing.',robots:noindex},
 '/editing':{path:'/editing',title:'Editing — DocBit',description:'Edit, configure, validate and export a prepared dataset.',robots:noindex}
};
export const NOT_FOUND_META={title:'Page Not Found | DocBit',description:'This page does not exist on DocBit.',robots:'noindex, follow'};
