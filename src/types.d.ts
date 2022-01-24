interface Digitaljs {
  Circuit: any;
  Monitor: any;
  MonitorView: any;
  IOPanelView: any;
  transform: any;
  engines: any;
}

declare var digitaljs: Digitaljs;

interface Document {
  digitaljsInput: string;
  simplifyDiagram: boolean;
  layoutEngine: string;
  simulationEngine: string;
  workerURL: any;
}
