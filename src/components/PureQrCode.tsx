import React, { useMemo } from 'react';
import Svg, { Rect, Path } from 'react-native-svg';

interface PureQrCodeProps {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

/**
 * Componente nativo puro e ultra-leve para renderização de QR Code.
 * Utiliza o algoritmo matemático do qrcode core com SVG Path vetorial,
 * sem qualquer dependência de Node.js (fs, stream) ou browser (window, document, canvas).
 */
export const PureQrCode: React.FC<PureQrCodeProps> = ({
  value,
  size = 200,
  color = '#000000',
  backgroundColor = '#FFFFFF',
}) => {
  const { pathData, moduleCount } = useMemo(() => {
    try {
      let QRCodeCore: any;
      try {
        QRCodeCore = require('qrcode/lib/core/qrcode');
      } catch {
        QRCodeCore = require('qrcode');
      }
      const safeValue = (value ? String(value).trim() : '') || 'BINFAE';
      const qrData = QRCodeCore.create(safeValue, { errorCorrectionLevel: 'M' });
      const moduleSize = qrData.modules.size;
      const data = qrData.modules.data;
      const cellSize = size / moduleSize;

      let d = '';
      for (let r = 0; r < moduleSize; r++) {
        for (let c = 0; c < moduleSize; c++) {
          if (data[r * moduleSize + c]) {
            // Desenha um quadrado para cada módulo ativo
            d += `M${(c * cellSize).toFixed(2)},${(r * cellSize).toFixed(2)}h${cellSize.toFixed(2)}v${cellSize.toFixed(2)}h-${cellSize.toFixed(2)}z `;
          }
        }
      }
      return { pathData: d, moduleCount: moduleSize };
    } catch (err) {
      console.warn('Erro ao gerar matriz vetorial do QR Code:', err);
      return { pathData: '', moduleCount: 21 };
    }
  }, [value, size]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect width={size} height={size} fill={backgroundColor} />
      {pathData ? <Path d={pathData} fill={color} /> : null}
    </Svg>
  );
};
