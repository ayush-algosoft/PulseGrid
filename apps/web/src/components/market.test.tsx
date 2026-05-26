import { OrderBookLadder, TickerValue } from '@pulsegrid/ui';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('UI components', () => {
  it('renders a ticker value', () => {
    render(<TickerValue value={42000} formatted="42,000.00" />);
    expect(screen.getByText('42,000.00')).toBeInTheDocument();
  });

  it('renders an order book ladder with both sides and a spread', () => {
    render(
      <OrderBookLadder
        bids={[
          [99, 5],
          [98, 8],
        ]}
        asks={[
          [101, 4],
          [102, 7],
        ]}
        formatPrice={(n) => n.toFixed(2)}
        formatSize={(n) => n.toFixed(0)}
      />,
    );
    expect(screen.getByText('Spread')).toBeInTheDocument();
    expect(screen.getByText('99.00')).toBeInTheDocument();
    expect(screen.getByText('101.00')).toBeInTheDocument();
  });
});
