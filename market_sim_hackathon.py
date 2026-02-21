# Minimal Hackathon Trading Game
# Run with: streamlit run market_sim_hackathon.py

import streamlit as st
import pandas as pd
import random

st.set_page_config(page_title='Market Sim', layout='wide')

# ====== Initialize Game ======
if 'portfolio' not in st.session_state:
    st.session_state.portfolio = {
        'Cash': 10000,
        'Holdings': {},
        'XP': 0,
        'Turn': 1
    }

# Fake stock list with starting prices
stocks = {
    'TechCo': 100,
    'GreenEnergy': 80,
    'RetailMart': 50,
    'HealthPlus': 120,
    'FinBank': 70
}

# Initialize random walk prices if first run
if 'prices' not in st.session_state:
    st.session_state.prices = {s: [p] for s, p in stocks.items()}

st.title('📈 Market Sim: Hackathon Edition')

# ====== Sidebar Portfolio ======
st.sidebar.header('Portfolio')
st.sidebar.write(f"Cash: ${st.session_state.portfolio['Cash']:.2f}")
st.sidebar.write('Holdings:')
for stock, qty in st.session_state.portfolio['Holdings'].items():
    st.sidebar.write(f"{stock}: {qty} shares")
st.sidebar.write(f"XP: {st.session_state.portfolio['XP']}")
st.sidebar.write(f"Turn: {st.session_state.portfolio['Turn']}")

# ====== Display Current Prices ======
st.subheader('Current Stock Prices')
current_prices = {s: st.session_state.prices[s][-1] for s in stocks}
price_df = pd.DataFrame.from_dict(current_prices, orient='index', columns=['Price'])
st.dataframe(price_df.style.format({'Price': '${:.2f}'}))

# ====== Trading Section ======
st.subheader('Trade')
stock_choice = st.selectbox('Select Stock', list(stocks.keys()))
trade_type = st.radio('Action', ['Buy', 'Sell'])
qty = st.number_input('Quantity', min_value=1, step=1, value=1)

if st.button('Execute Trade'):
    price = current_prices[stock_choice]
    if trade_type == 'Buy':
        cost = price * qty
        if cost <= st.session_state.portfolio['Cash']:
            st.session_state.portfolio['Cash'] -= cost
            st.session_state.portfolio['Holdings'][stock_choice] = st.session_state.portfolio['Holdings'].get(stock_choice, 0) + qty
            st.success(f'Bought {qty} shares of {stock_choice} for ${cost:.2f}')
            st.session_state.portfolio['XP'] += 5
        else:
            st.error('Not enough cash!')
    else:  # Sell
        if stock_choice in st.session_state.portfolio['Holdings'] and st.session_state.portfolio['Holdings'][stock_choice] >= qty:
            revenue = price * qty
            st.session_state.portfolio['Cash'] += revenue
            st.session_state.portfolio['Holdings'][stock_choice] -= qty
            if st.session_state.portfolio['Holdings'][stock_choice] == 0:
                del st.session_state.portfolio['Holdings'][stock_choice]
            st.success(f'Sold {qty} shares of {stock_choice} for ${revenue:.2f}')
            st.session_state.portfolio['XP'] += 5
        else:
            st.error('Not enough shares to sell!')

# ====== Random Market Movement ======
st.subheader('Market Update')
for s in stocks:
    change = random.uniform(0.95, 1.05)  # simulate ±5% move
    new_price = st.session_state.prices[s][-1] * change
    st.session_state.prices[s].append(round(new_price, 2))
st.session_state.portfolio['Turn'] += 1
st.write('Prices updated! Next turn.')

# ====== Feedback / Lessons ======
st.subheader('Quick Lesson')
lessons = []

# Concentration risk
if len(st.session_state.portfolio['Holdings']) == 1 and st.session_state.portfolio['Holdings']:
    lessons.append('⚠️ All in one stock! Diversification reduces risk.')

# Cash idle
if st.session_state.portfolio['Cash'] > 5000:
    lessons.append('💡 You have a lot of cash. Consider investing some.')

# XP milestone
if st.session_state.portfolio['XP'] % 20 == 0 and st.session_state.portfolio['XP'] != 0:
    lessons.append('🏆 Good job! Keep making smart trades.')

if lessons:
    for l in lessons:
        st.write(l)
else:
    st.write('No immediate lessons. Keep trading!')

# ====== Portfolio Value Over Time ======
st.subheader('Portfolio Value Over Time')
portfolio_value = []
for i in range(len(st.session_state.prices[next(iter(stocks))])):
    total = st.session_state.portfolio['Cash']
    for s, qty in st.session_state.portfolio['Holdings'].items():
        total += st.session_state.prices[s][i] * qty
    portfolio_value.append(total)

st.line_chart(portfolio_value)