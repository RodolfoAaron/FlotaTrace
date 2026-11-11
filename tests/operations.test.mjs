import test from 'node:test';
import assert from 'node:assert/strict';
import {peruDayBounds,movementLabels} from '../web/operations.js';
test('el total diario usa la fecha de Perú aun cuando UTC ya cambió de día',()=>{
 assert.deepEqual(peruDayBounds('2026-11-12T02:30:00Z'),{from:'2026-11-11T05:00:00.000Z',to:'2026-11-12T05:00:00.000Z'});
 assert.deepEqual(peruDayBounds('2027-01-01T06:00:00Z'),{from:'2027-01-01T05:00:00.000Z',to:'2027-01-02T05:00:00.000Z'});
});
test('un cambio de catálogo no cambia los nombres históricos',()=>{
 const labels=movementLabels({vehicle_id:'v',warehouse_id:'w',vehicle_plate:'ABC-123',warehouse_name:'Huancayo original'},[{id:'v',plate:'NUEVA'}],[{id:'w',name:'Otro nombre'}]);
 assert.deepEqual(labels,{vehicle:'ABC-123',warehouse:'Huancayo original'});
});
test('registros antiguos de ensayo usan catálogos o identificador',()=>{
 assert.deepEqual(movementLabels({vehicle_id:'v',warehouse_id:'w'},[{id:'v',plate:'ABC-123'}]),{vehicle:'ABC-123',warehouse:'w'});
});
