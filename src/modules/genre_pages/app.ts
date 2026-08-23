import { waitForDocumentReady } from "~/shared/utils/dom";

const CHART_CONTROLS_HTML = `
<div id="page_chart_query" class="page_chart_query page_chart_query_frame_inner chart_type_top object_release date_type_all_time">
  <div class="page_chart_query_item_frame">
    <div class="page_chart_query_main_criteria">
      <div class="page_chart_query_item page_chart_query_item_type_selector" onclick="RYMchart.openChartTypeSelect();">
        <div id="page_chart_query_item_chart_type_title" class="page_chart_query_item_title">Top</div>
        <div class="page_chart_query_item_selector"><i class="fa fa-caret-down"></i></div>
      </div>
      <div id="page_chart_query_item_type_select" class="chart_ui_filter_list page_chart_query_item_type_select" style="display: none;">
        <div class="page_chart_query_item_option" onclick="return RYMchart.onClickChartType(event, $(this));" data-description="Top" data-value="top">
          <div class="page_chart_query_item_option_icon page_chart_query_item_option_icon_chart_type_top">
            <i class="fa fa-circle"></i><i class="far fa-circle"></i>
          </div>
          <div class="page_chart_query_item_option_label">
            Top
          </div>
          <div class="page_chart_query_item_option_description">
            <span>As determined by users' ratings</span>
          </div>
        </div>
        <div class="page_chart_query_item_option" onclick="return RYMchart.onClickChartType(event, $(this));" data-description="Popular" data-value="popular">
          <div class="page_chart_query_item_option_icon page_chart_query_item_option_icon_chart_type_popular">
            <i class="fa fa-circle"></i><i class="far fa-circle"></i>
          </div>
          <div class="page_chart_query_item_option_label">
            Popular
          </div>
          <div class="page_chart_query_item_option_description">
            <span>Most number of ratings</span>
          </div>
        </div>
        <div class="page_chart_query_item_option" onclick="return RYMchart.onClickChartType(event, $(this));" data-description="Esoteric" data-value="esoteric">
          <div class="page_chart_query_item_option_icon page_chart_query_item_option_icon_chart_type_esoteric">
            <i class="fa fa-circle"></i><i class="far fa-circle"></i>
          </div>
          <div class="page_chart_query_item_option_label">
            Esoteric
          </div>
          <div class="page_chart_query_item_option_description">
            <span>Relatively unknown but with high average ratings</span>
          </div>
        </div>
        <div class="page_chart_query_item_option" onclick="return RYMchart.onClickChartType(event, $(this));" data-description="Diverse" data-value="diverse">
          <div class="page_chart_query_item_option_icon page_chart_query_item_option_icon_chart_type_diverse">
            <i class="fa fa-circle"></i><i class="far fa-circle"></i>
          </div>
          <div class="page_chart_query_item_option_label">
            Diverse
          </div>
          <div class="page_chart_query_item_option_description">
            <span>Artists are limited to one entry per chart</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="page_chart_query_item_frame">
    <div class="page_chart_query_item page_chart_query_item_type_selector" onclick="RYMchart.openObjectTypeSelect();">
      <div id="page_chart_query_item_chart_object_title" class="page_chart_query_item_title">Albums</div>
      <div class="page_chart_query_item_selector"><i class="fa fa-caret-down"></i></div>
    </div>
    <div id="page_chart_query_item_chart_object_select" class="chart_ui_filter_list page_chart_query_item_chart_object_select" style="display: none;">
      <div class="page_chart_query_item_option" onclick="return RYMchart.onClickObjectType(event, $(this));" data-description="Releases" data-value="release">
        <div class="page_chart_query_item_option_icon page_chart_query_item_option_icon_object_release">
          <i class="fa fa-circle"></i><i class="far fa-circle"></i>
        </div>
        <div class="page_chart_query_item_option_label">
          Music releases
        </div>
        <div class="page_chart_query_item_option_description">
          <span>Albums, EPs, etc.</span>
        </div>
      </div>
      <div id="chart_section_release_type" class="chart_section_release_type">
        <div class="chart_section_release_type_chooser_frame">
          <div class="chart_release_all_none">
            <a id="chart_release_all_none_btn_all" class="chart_release_all_none_btn" onclick="RYMchart.selectReleaseTypeAll();">all</a> |
            <a id="chart_release_all_none_btn_main" class="chart_release_all_none_btn" onclick="RYMchart.selectReleaseTypeMain();">main</a> |
            <a id="chart_release_all_none_btn_albums" class="chart_release_all_none_btn" onclick="RYMchart.selectReleaseTypeAlbums();">albums</a> |
            <a id="chart_release_all_none_btn_singles" class="chart_release_all_none_btn" onclick="RYMchart.selectReleaseTypeSingles();">singles</a> |
            <a id="chart_release_all_none_btn_clear" class="chart_release_all_none_btn" onclick="RYMchart.selectReleaseTypeNone();">clear</a>
          </div>
          <div class="clear"></div>
          <div class="release_type_chooser">
            <div class="release_type_chooser_row"><div onclick="RYMchart.toggleReleaseType('album');" data-val="album" id="release_type_btn_album" class="release_type_btn selected">Album</div><div onclick="RYMchart.toggleReleaseType('ep');" data-val="ep" id="release_type_btn_ep" class="release_type_btn">EP</div><div onclick="RYMchart.toggleReleaseType('mixtape');" data-val="mixtape" id="release_type_btn_mixtape" class="release_type_btn">Mixtape</div><div onclick="RYMchart.toggleReleaseType('djmix');" data-val="djmix" id="release_type_btn_djmix" class="release_type_btn">DJ Mix</div>
            </div>
            <div class="release_type_chooser_row"><div onclick="RYMchart.toggleReleaseType('single');" data-val="single" id="release_type_btn_single" class="release_type_btn">Single</div><div onclick="RYMchart.toggleReleaseType('comp');" data-val="comp" id="release_type_btn_comp" class="release_type_btn">Compilation</div><div onclick="RYMchart.toggleReleaseType('video');" data-val="video" id="release_type_btn_video" class="release_type_btn">Video</div><div onclick="RYMchart.toggleReleaseType('unauth');" data-val="unauth" id="release_type_btn_unauth" class="release_type_btn">Unauthorized</div></div>
          </div>
          <div class="release_type_chooser ebr-release-type-extra-row">
            <div class="release_type_chooser_row" style="border: none">
              <div onclick="RYMchart.toggleReleaseType('musicvideo');" data-val="musicvideo" id="release_type_btn_musicvideo" class="release_type_btn">Music video</div>
              <div onclick="RYMchart.toggleReleaseType('additional');" data-val="additional" id="release_type_btn_additional" class="release_type_btn">Addl release</div>
              <div onclick="RYMchart.toggleReleaseType('song');" data-val="song" id="release_type_btn_song" class="release_type_btn">Songs</div>
            </div>
          </div>
          <div class="chart_section_release_type_chooser_frame_apply_btn">
            <a onclick="RYMchart.closeObjectTypeSelect();" class="btn blue_btn">Close</a>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="page_chart_query_item label">
    of
  </div>
  <div class="page_chart_query_item_frame">
    <div class="page_chart_query_item page_chart_query_item_type_selector" onclick="RYMchart.openDateSelect();">
      <div id="page_chart_query_item_chart_date_type_title" class="page_chart_query_item_title">All-time</div>
      <div class="page_chart_query_item_selector"><i class="fa fa-caret-down"></i></div>
    </div>
    <div id="page_chart_query_item_date_select" class="chart_ui_filter_list page_chart_query_item_date_select" style="display: none;">
      <div class="page_chart_query_item_option page_chart_query_item_option_date_type_all_time" onclick="return RYMchart.onClickDateType(event, $(this));" data-description="All-time" data-value="all_time">
        <div class="page_chart_query_item_option_icon">
          <i class="fa fa-circle"></i><i class="far fa-circle"></i>
        </div>
        <div class="page_chart_query_item_option_label">
          All-time 
        </div>
        <div class="page_chart_query_item_option_description">
          <span>Charts from all-time</span>
        </div>
      </div>
      <div class="page_chart_query_item_option page_chart_query_item_option_date_type_year_decade" onclick="return RYMchart.onClickDateType(event, $(this));" data-description="Year or Decade" data-value="year_decade">
        <div class="page_chart_query_item_option_icon">
          <i class="fa fa-circle"></i><i class="far fa-circle"></i>
        </div>
        <div class="page_chart_query_item_option_label">
          Specific year or decade
        </div>
        <div class="page_chart_query_item_option_description">
          <span>Ex. "1984", "2010s"</span>
        </div>
      </div>
      <div class="page_chart_query_item_option page_chart_query_item_option_date_type_year_range" onclick="return RYMchart.onClickDateType(event, $(this));" data-description="Year range" data-value="year_range">
        <div class="page_chart_query_item_option_icon">
          <i class="fa fa-circle"></i><i class="far fa-circle"></i>
        </div>
        <div class="page_chart_query_item_option_label">
          Year range
        </div>
        <div class="page_chart_query_item_option_description">
          <span>Ex. "1984-2016"</span>
        </div>
      </div>
      <div class="ebr-chart-date-help">
        <div class="help_bubble ebr-chart-date-help-all-time">
          <p>Charts include releases from all years.</p>
        </div>
        <div class="help_bubble ebr-chart-date-help-year-decade">
          <p>To choose a single year, click a year (for example, "15" for 2015).</p>
          <p>To choose a decade, click the decade in the left column.</p>
        </div>
        <div class="help_bubble ebr-chart-date-help-year-range">
          <p>To choose a year range, click the first year or decade, then click the second year or decade.</p>
        </div>
      </div>
      <div class="date_year_chooser" id="date_year_chooser" style="">
        <div class="date_year_chooser_row">
          <div id="date_year_chooser_decade_2020" onmousedown="RYMchart.onMouseDownDateChooserDecade(event,2020);" onmouseup="RYMchart.onMouseUpDateChooserDecade(event,2020);" onmouseover="RYMchart.onMouseOverDateChooserDecade(event,2020);" class="date_year_chooser_decade_btn">2020s</div>
          <div id="date_year_chooser_year_2020" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2020);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2020);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2020);" style="width:11.43%">2020</div>
          <div id="date_year_chooser_year_2021" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2021);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2021);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2021);" style="width:11.43%">2021</div>
          <div id="date_year_chooser_year_2022" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2022);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2022);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2022);" style="width:11.43%">2022</div>
          <div id="date_year_chooser_year_2023" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2023);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2023);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2023);" style="width:11.43%">2023</div>
          <div id="date_year_chooser_year_2024" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2024);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2024);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2024);" style="width:11.43%">2024</div>
          <div id="date_year_chooser_year_2025" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2025);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2025);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2025);" style="width:11.43%">2025</div>
          <div id="date_year_chooser_year_2026" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2026);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2026);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2026);" style="width:11.42%">2026</div>
        </div>
        <div class="date_year_chooser_row">
          <div id="date_year_chooser_decade_2010" onmousedown="RYMchart.onMouseDownDateChooserDecade(event,2010);" onmouseup="RYMchart.onMouseUpDateChooserDecade(event,2010);" onmouseover="RYMchart.onMouseOverDateChooserDecade(event,2010);" class="date_year_chooser_decade_btn">2010s</div>
          <div id="date_year_chooser_year_2010" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2010);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2010);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2010);" data-tiptip="2010">10</div>
          <div id="date_year_chooser_year_2011" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2011);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2011);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2011);" data-tiptip="2011">11</div>
          <div id="date_year_chooser_year_2012" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2012);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2012);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2012);" data-tiptip="2012">12</div>
          <div id="date_year_chooser_year_2013" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2013);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2013);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2013);" data-tiptip="2013">13</div>
          <div id="date_year_chooser_year_2014" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2014);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2014);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2014);" data-tiptip="2014">14</div>
          <div id="date_year_chooser_year_2015" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2015);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2015);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2015);" data-tiptip="2015">15</div>
          <div id="date_year_chooser_year_2016" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2016);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2016);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2016);" data-tiptip="2016">16</div>
          <div id="date_year_chooser_year_2017" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2017);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2017);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2017);" data-tiptip="2017">17</div>
          <div id="date_year_chooser_year_2018" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2018);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2018);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2018);" data-tiptip="2018">18</div>
          <div id="date_year_chooser_year_2019" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2019);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2019);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2019);" data-tiptip="2019">19</div>
        </div>
        <div class="date_year_chooser_row">
          <div id="date_year_chooser_decade_2000" onmousedown="RYMchart.onMouseDownDateChooserDecade(event,2000);" onmouseup="RYMchart.onMouseUpDateChooserDecade(event,2000);" onmouseover="RYMchart.onMouseOverDateChooserDecade(event,2000);" class="date_year_chooser_decade_btn">2000s</div>
          <div id="date_year_chooser_year_2000" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2000);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2000);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2000);" data-tiptip="2000">00</div>
          <div id="date_year_chooser_year_2001" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2001);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2001);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2001);" data-tiptip="2001">01</div>
          <div id="date_year_chooser_year_2002" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2002);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2002);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2002);" data-tiptip="2002">02</div>
          <div id="date_year_chooser_year_2003" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2003);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2003);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2003);" data-tiptip="2003">03</div>
          <div id="date_year_chooser_year_2004" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2004);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2004);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2004);" data-tiptip="2004">04</div>
          <div id="date_year_chooser_year_2005" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2005);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2005);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2005);" data-tiptip="2005">05</div>
          <div id="date_year_chooser_year_2006" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2006);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2006);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2006);" data-tiptip="2006">06</div>
          <div id="date_year_chooser_year_2007" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2007);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2007);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2007);" data-tiptip="2007">07</div>
          <div id="date_year_chooser_year_2008" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2008);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2008);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2008);" data-tiptip="2008">08</div>
          <div id="date_year_chooser_year_2009" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,2009);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,2009);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,2009);" data-tiptip="2009">09</div>
        </div>
        <div class="date_year_chooser_row">
          <div id="date_year_chooser_decade_1990" onmousedown="RYMchart.onMouseDownDateChooserDecade(event,1990);" onmouseup="RYMchart.onMouseUpDateChooserDecade(event,1990);" onmouseover="RYMchart.onMouseOverDateChooserDecade(event,1990);" class="date_year_chooser_decade_btn">1990s</div>
          <div id="date_year_chooser_year_1990" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1990);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1990);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1990);" data-tiptip="1990">90</div>
          <div id="date_year_chooser_year_1991" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1991);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1991);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1991);" data-tiptip="1991">91</div>
          <div id="date_year_chooser_year_1992" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1992);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1992);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1992);" data-tiptip="1992">92</div>
          <div id="date_year_chooser_year_1993" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1993);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1993);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1993);" data-tiptip="1993">93</div>
          <div id="date_year_chooser_year_1994" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1994);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1994);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1994);" data-tiptip="1994">94</div>
          <div id="date_year_chooser_year_1995" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1995);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1995);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1995);" data-tiptip="1995">95</div>
          <div id="date_year_chooser_year_1996" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1996);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1996);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1996);" data-tiptip="1996">96</div>
          <div id="date_year_chooser_year_1997" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1997);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1997);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1997);" data-tiptip="1997">97</div>
          <div id="date_year_chooser_year_1998" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1998);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1998);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1998);" data-tiptip="1998">98</div>
          <div id="date_year_chooser_year_1999" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1999);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1999);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1999);" data-tiptip="1999">99</div>
        </div>
        <div class="date_year_chooser_row">
          <div id="date_year_chooser_decade_1980" onmousedown="RYMchart.onMouseDownDateChooserDecade(event,1980);" onmouseup="RYMchart.onMouseUpDateChooserDecade(event,1980);" onmouseover="RYMchart.onMouseOverDateChooserDecade(event,1980);" class="date_year_chooser_decade_btn">1980s</div>
          <div id="date_year_chooser_year_1980" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1980);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1980);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1980);" data-tiptip="1980">80</div>
          <div id="date_year_chooser_year_1981" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1981);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1981);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1981);" data-tiptip="1981">81</div>
          <div id="date_year_chooser_year_1982" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1982);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1982);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1982);" data-tiptip="1982">82</div>
          <div id="date_year_chooser_year_1983" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1983);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1983);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1983);" data-tiptip="1983">83</div>
          <div id="date_year_chooser_year_1984" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1984);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1984);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1984);" data-tiptip="1984">84</div>
          <div id="date_year_chooser_year_1985" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1985);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1985);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1985);" data-tiptip="1985">85</div>
          <div id="date_year_chooser_year_1986" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1986);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1986);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1986);" data-tiptip="1986">86</div>
          <div id="date_year_chooser_year_1987" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1987);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1987);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1987);" data-tiptip="1987">87</div>
          <div id="date_year_chooser_year_1988" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1988);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1988);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1988);" data-tiptip="1988">88</div>
          <div id="date_year_chooser_year_1989" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1989);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1989);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1989);" data-tiptip="1989">89</div>
        </div>
        <div class="date_year_chooser_row">
          <div id="date_year_chooser_decade_1970" onmousedown="RYMchart.onMouseDownDateChooserDecade(event,1970);" onmouseup="RYMchart.onMouseUpDateChooserDecade(event,1970);" onmouseover="RYMchart.onMouseOverDateChooserDecade(event,1970);" class="date_year_chooser_decade_btn">1970s</div>
          <div id="date_year_chooser_year_1970" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1970);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1970);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1970);" data-tiptip="1970">70</div>
          <div id="date_year_chooser_year_1971" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1971);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1971);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1971);" data-tiptip="1971">71</div>
          <div id="date_year_chooser_year_1972" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1972);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1972);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1972);" data-tiptip="1972">72</div>
          <div id="date_year_chooser_year_1973" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1973);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1973);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1973);" data-tiptip="1973">73</div>
          <div id="date_year_chooser_year_1974" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1974);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1974);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1974);" data-tiptip="1974">74</div>
          <div id="date_year_chooser_year_1975" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1975);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1975);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1975);" data-tiptip="1975">75</div>
          <div id="date_year_chooser_year_1976" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1976);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1976);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1976);" data-tiptip="1976">76</div>
          <div id="date_year_chooser_year_1977" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1977);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1977);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1977);" data-tiptip="1977">77</div>
          <div id="date_year_chooser_year_1978" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1978);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1978);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1978);" data-tiptip="1978">78</div>
          <div id="date_year_chooser_year_1979" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1979);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1979);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1979);" data-tiptip="1979">79</div>
        </div>
        <div class="date_year_chooser_row">
          <div id="date_year_chooser_decade_1960" onmousedown="RYMchart.onMouseDownDateChooserDecade(event,1960);" onmouseup="RYMchart.onMouseUpDateChooserDecade(event,1960);" onmouseover="RYMchart.onMouseOverDateChooserDecade(event,1960);" class="date_year_chooser_decade_btn">1960s</div>
          <div id="date_year_chooser_year_1960" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1960);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1960);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1960);" data-tiptip="1960">60</div>
          <div id="date_year_chooser_year_1961" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1961);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1961);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1961);" data-tiptip="1961">61</div>
          <div id="date_year_chooser_year_1962" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1962);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1962);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1962);" data-tiptip="1962">62</div>
          <div id="date_year_chooser_year_1963" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1963);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1963);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1963);" data-tiptip="1963">63</div>
          <div id="date_year_chooser_year_1964" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1964);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1964);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1964);" data-tiptip="1964">64</div>
          <div id="date_year_chooser_year_1965" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1965);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1965);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1965);" data-tiptip="1965">65</div>
          <div id="date_year_chooser_year_1966" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1966);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1966);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1966);" data-tiptip="1966">66</div>
          <div id="date_year_chooser_year_1967" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1967);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1967);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1967);" data-tiptip="1967">67</div>
          <div id="date_year_chooser_year_1968" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1968);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1968);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1968);" data-tiptip="1968">68</div>
          <div id="date_year_chooser_year_1969" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1969);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1969);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1969);" data-tiptip="1969">69</div>
        </div>
        <div class="date_year_chooser_row">
          <div id="date_year_chooser_decade_1950" onmousedown="RYMchart.onMouseDownDateChooserDecade(event,1950);" onmouseup="RYMchart.onMouseUpDateChooserDecade(event,1950);" onmouseover="RYMchart.onMouseOverDateChooserDecade(event,1950);" class="date_year_chooser_decade_btn">1950s</div>
          <div id="date_year_chooser_year_1950" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1950);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1950);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1950);" data-tiptip="1950">50</div>
          <div id="date_year_chooser_year_1951" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1951);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1951);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1951);" data-tiptip="1951">51</div>
          <div id="date_year_chooser_year_1952" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1952);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1952);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1952);" data-tiptip="1952">52</div>
          <div id="date_year_chooser_year_1953" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1953);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1953);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1953);" data-tiptip="1953">53</div>
          <div id="date_year_chooser_year_1954" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1954);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1954);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1954);" data-tiptip="1954">54</div>
          <div id="date_year_chooser_year_1955" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1955);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1955);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1955);" data-tiptip="1955">55</div>
          <div id="date_year_chooser_year_1956" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1956);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1956);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1956);" data-tiptip="1956">56</div>
          <div id="date_year_chooser_year_1957" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1957);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1957);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1957);" data-tiptip="1957">57</div>
          <div id="date_year_chooser_year_1958" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1958);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1958);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1958);" data-tiptip="1958">58</div>
          <div id="date_year_chooser_year_1959" class="date_year_chooser_year_btn" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1959);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1959);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1959);" data-tiptip="1959">59</div>
        </div>
        <div id="date_year_chooser_extra">
          <div class="date_year_chooser_row">
            <div id="date_year_chooser_decade_1940" onmousedown="RYMchart.onMouseDownDateChooserDecade(event,1940);" onmouseup="RYMchart.onMouseUpDateChooserDecade(event,1940);" onmouseover="RYMchart.onMouseOverDateChooserDecade(event,1940);" class="date_year_chooser_decade_btn">1940s</div>
            <div id="date_year_chooser_year_1940" class="date_year_chooser_year_btn" data-tiptip="1940" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1940);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1940);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1940);">40</div>
            <div id="date_year_chooser_year_1941" class="date_year_chooser_year_btn" data-tiptip="1941" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1941);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1941);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1941);">41</div>
            <div id="date_year_chooser_year_1942" class="date_year_chooser_year_btn" data-tiptip="1942" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1942);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1942);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1942);">42</div>
            <div id="date_year_chooser_year_1943" class="date_year_chooser_year_btn" data-tiptip="1943" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1943);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1943);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1943);">43</div>
            <div id="date_year_chooser_year_1944" class="date_year_chooser_year_btn" data-tiptip="1944" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1944);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1944);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1944);">44</div>
            <div id="date_year_chooser_year_1945" class="date_year_chooser_year_btn" data-tiptip="1945" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1945);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1945);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1945);">45</div>
            <div id="date_year_chooser_year_1946" class="date_year_chooser_year_btn" data-tiptip="1946" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1946);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1946);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1946);">46</div>
            <div id="date_year_chooser_year_1947" class="date_year_chooser_year_btn" data-tiptip="1947" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1947);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1947);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1947);">47</div>
            <div id="date_year_chooser_year_1948" class="date_year_chooser_year_btn" data-tiptip="1948" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1948);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1948);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1948);">48</div>
            <div id="date_year_chooser_year_1949" class="date_year_chooser_year_btn" data-tiptip="1949" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1949);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1949);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1949);">49</div>
          </div>
          <div class="date_year_chooser_row">
            <div id="date_year_chooser_decade_1930" onmousedown="RYMchart.onMouseDownDateChooserDecade(event,1930);" onmouseup="RYMchart.onMouseUpDateChooserDecade(event,1930);" onmouseover="RYMchart.onMouseOverDateChooserDecade(event,1930);" class="date_year_chooser_decade_btn">1930s</div>
            <div id="date_year_chooser_year_1930" class="date_year_chooser_year_btn" data-tiptip="1930" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1930);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1930);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1930);">30</div>
            <div id="date_year_chooser_year_1931" class="date_year_chooser_year_btn" data-tiptip="1931" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1931);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1931);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1931);">31</div>
            <div id="date_year_chooser_year_1932" class="date_year_chooser_year_btn" data-tiptip="1932" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1932);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1932);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1932);">32</div>
            <div id="date_year_chooser_year_1933" class="date_year_chooser_year_btn" data-tiptip="1933" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1933);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1933);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1933);">33</div>
            <div id="date_year_chooser_year_1934" class="date_year_chooser_year_btn" data-tiptip="1934" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1934);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1934);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1934);">34</div>
            <div id="date_year_chooser_year_1935" class="date_year_chooser_year_btn" data-tiptip="1935" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1935);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1935);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1935);">35</div>
            <div id="date_year_chooser_year_1936" class="date_year_chooser_year_btn" data-tiptip="1936" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1936);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1936);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1936);">36</div>
            <div id="date_year_chooser_year_1937" class="date_year_chooser_year_btn" data-tiptip="1937" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1937);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1937);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1937);">37</div>
            <div id="date_year_chooser_year_1938" class="date_year_chooser_year_btn" data-tiptip="1938" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1938);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1938);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1938);">38</div>
            <div id="date_year_chooser_year_1939" class="date_year_chooser_year_btn" data-tiptip="1939" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1939);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1939);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1939);">39</div>
          </div>
          <div class="date_year_chooser_row">
            <div id="date_year_chooser_decade_1920" onmousedown="RYMchart.onMouseDownDateChooserDecade(event,1920);" onmouseup="RYMchart.onMouseUpDateChooserDecade(event,1920);" onmouseover="RYMchart.onMouseOverDateChooserDecade(event,1920);" class="date_year_chooser_decade_btn">1920s</div>
            <div id="date_year_chooser_year_1920" class="date_year_chooser_year_btn" data-tiptip="1920" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1920);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1920);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1920);">20</div>
            <div id="date_year_chooser_year_1921" class="date_year_chooser_year_btn" data-tiptip="1921" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1921);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1921);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1921);">21</div>
            <div id="date_year_chooser_year_1922" class="date_year_chooser_year_btn" data-tiptip="1922" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1922);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1922);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1922);">22</div>
            <div id="date_year_chooser_year_1923" class="date_year_chooser_year_btn" data-tiptip="1923" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1923);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1923);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1923);">23</div>
            <div id="date_year_chooser_year_1924" class="date_year_chooser_year_btn" data-tiptip="1924" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1924);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1924);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1924);">24</div>
            <div id="date_year_chooser_year_1925" class="date_year_chooser_year_btn" data-tiptip="1925" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1925);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1925);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1925);">25</div>
            <div id="date_year_chooser_year_1926" class="date_year_chooser_year_btn" data-tiptip="1926" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1926);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1926);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1926);">26</div>
            <div id="date_year_chooser_year_1927" class="date_year_chooser_year_btn" data-tiptip="1927" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1927);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1927);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1927);">27</div>
            <div id="date_year_chooser_year_1928" class="date_year_chooser_year_btn" data-tiptip="1928" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1928);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1928);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1928);">28</div>
            <div id="date_year_chooser_year_1929" class="date_year_chooser_year_btn" data-tiptip="1929" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1929);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1929);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1929);">29</div>
          </div>
          <div class="date_year_chooser_row">
            <div id="date_year_chooser_decade_1910" onmousedown="RYMchart.onMouseDownDateChooserDecade(event,1910);" onmouseup="RYMchart.onMouseUpDateChooserDecade(event,1910);" onmouseover="RYMchart.onMouseOverDateChooserDecade(event,1910);" class="date_year_chooser_decade_btn">1910s</div>
            <div id="date_year_chooser_year_1910" class="date_year_chooser_year_btn" data-tiptip="1910" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1910);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1910);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1910);">10</div>
            <div id="date_year_chooser_year_1911" class="date_year_chooser_year_btn" data-tiptip="1911" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1911);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1911);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1911);">11</div>
            <div id="date_year_chooser_year_1912" class="date_year_chooser_year_btn" data-tiptip="1912" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1912);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1912);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1912);">12</div>
            <div id="date_year_chooser_year_1913" class="date_year_chooser_year_btn" data-tiptip="1913" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1913);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1913);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1913);">13</div>
            <div id="date_year_chooser_year_1914" class="date_year_chooser_year_btn" data-tiptip="1914" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1914);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1914);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1914);">14</div>
            <div id="date_year_chooser_year_1915" class="date_year_chooser_year_btn" data-tiptip="1915" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1915);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1915);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1915);">15</div>
            <div id="date_year_chooser_year_1916" class="date_year_chooser_year_btn" data-tiptip="1916" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1916);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1916);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1916);">16</div>
            <div id="date_year_chooser_year_1917" class="date_year_chooser_year_btn" data-tiptip="1917" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1917);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1917);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1917);">17</div>
            <div id="date_year_chooser_year_1918" class="date_year_chooser_year_btn" data-tiptip="1918" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1918);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1918);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1918);">18</div>
            <div id="date_year_chooser_year_1919" class="date_year_chooser_year_btn" data-tiptip="1919" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1919);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1919);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1919);">19</div>
          </div>
          <div class="date_year_chooser_row">
            <div id="date_year_chooser_decade_1900" onmousedown="RYMchart.onMouseDownDateChooserDecade(event,1900);" onmouseup="RYMchart.onMouseUpDateChooserDecade(event,1900);" onmouseover="RYMchart.onMouseOverDateChooserDecade(event,1900);" class="date_year_chooser_decade_btn">1900s</div>
            <div id="date_year_chooser_year_1900" class="date_year_chooser_year_btn" data-tiptip="1900" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1900);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1900);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1900);">00</div>
            <div id="date_year_chooser_year_1901" class="date_year_chooser_year_btn" data-tiptip="1901" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1901);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1901);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1901);">01</div>
            <div id="date_year_chooser_year_1902" class="date_year_chooser_year_btn" data-tiptip="1902" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1902);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1902);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1902);">02</div>
            <div id="date_year_chooser_year_1903" class="date_year_chooser_year_btn" data-tiptip="1903" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1903);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1903);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1903);">03</div>
            <div id="date_year_chooser_year_1904" class="date_year_chooser_year_btn" data-tiptip="1904" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1904);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1904);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1904);">04</div>
            <div id="date_year_chooser_year_1905" class="date_year_chooser_year_btn" data-tiptip="1905" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1905);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1905);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1905);">05</div>
            <div id="date_year_chooser_year_1906" class="date_year_chooser_year_btn" data-tiptip="1906" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1906);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1906);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1906);">06</div>
            <div id="date_year_chooser_year_1907" class="date_year_chooser_year_btn" data-tiptip="1907" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1907);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1907);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1907);">07</div>
            <div id="date_year_chooser_year_1908" class="date_year_chooser_year_btn" data-tiptip="1908" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1908);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1908);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1908);">08</div>
            <div id="date_year_chooser_year_1909" class="date_year_chooser_year_btn" data-tiptip="1909" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1909);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1909);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1909);">09</div>
          </div>
          <div class="date_year_chooser_row">
            <div id="date_year_chooser_decade_1890" onmousedown="RYMchart.onMouseDownDateChooserDecade(event,1890);" onmouseup="RYMchart.onMouseUpDateChooserDecade(event,1890);" onmouseover="RYMchart.onMouseOverDateChooserDecade(event,1890);" class="date_year_chooser_decade_btn">1890s</div>
            <div id="date_year_chooser_year_1890" class="date_year_chooser_year_btn" data-tiptip="1890" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1890);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1890);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1890);">90</div>
            <div id="date_year_chooser_year_1891" class="date_year_chooser_year_btn" data-tiptip="1891" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1891);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1891);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1891);">91</div>
            <div id="date_year_chooser_year_1892" class="date_year_chooser_year_btn" data-tiptip="1892" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1892);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1892);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1892);">92</div>
            <div id="date_year_chooser_year_1893" class="date_year_chooser_year_btn" data-tiptip="1893" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1893);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1893);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1893);">93</div>
            <div id="date_year_chooser_year_1894" class="date_year_chooser_year_btn" data-tiptip="1894" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1894);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1894);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1894);">94</div>
            <div id="date_year_chooser_year_1895" class="date_year_chooser_year_btn" data-tiptip="1895" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1895);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1895);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1895);">95</div>
            <div id="date_year_chooser_year_1896" class="date_year_chooser_year_btn" data-tiptip="1896" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1896);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1896);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1896);">96</div>
            <div id="date_year_chooser_year_1897" class="date_year_chooser_year_btn" data-tiptip="1897" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1897);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1897);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1897);">97</div>
            <div id="date_year_chooser_year_1898" class="date_year_chooser_year_btn" data-tiptip="1898" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1898);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1898);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1898);">98</div>
            <div id="date_year_chooser_year_1899" class="date_year_chooser_year_btn" data-tiptip="1899" onmousedown="RYMchart.onMouseDownDateChooserYear(event,1899);" onmouseup="RYMchart.onMouseUpDateChooserYear(event,1899);" onmouseover="RYMchart.onMouseOverDateChooserYear(event,1899);">99</div>
          </div>
        </div>
        <div class="date_year_chooser_toggle" onclick="$('#date_year_chooser_extra').slideToggle();$('#date_year_toggle_icon').toggleClass('fa-caret-down').toggleClass('fa-caret-up');"> <i id="date_year_toggle_icon" class="fa fa-caret-down"></i></div>
        <div class="page_chart_query_date_close">
          <a class="btn blue_btn" onclick="RYMchart.closeDateSelect()">Close</a>
        </div>
      </div>
    </div>
  </div>
</div>
`;

const RELEASE_TYPE_LABELS: Record<string, string> = {
	album: "Album",
	ep: "EP",
	mixtape: "Mixtape",
	djmix: "DJ Mix",
	single: "Single",
	comp: "Compilation",
	video: "Video",
	unauth: "Unauthorized",
	song: "Song",
	musicvideo: "Music Video",
	additional: "Additional Release",
};

type RYMChartState = {
	chart_type?: string;
	chart_object?: string;
	chart_date_range_type?: string;
	release_types?: string[];
	start_date?: number;
	end_date?: number;
};

type RYMChartLike = {
	state: RYMChartState;
	_updateFrameClass?: () => void;
	_updateReleaseTypeValue?: () => void;
	openChartTypeSelect?: () => void;
	closeChartTypeSelect?: () => void;
	onClickChartType?: (event: Event, option: unknown) => boolean;
	openObjectTypeSelect?: () => void;
	closeObjectTypeSelect?: () => void;
	onClickObjectType?: (event: Event, option: unknown) => boolean;
	openDateSelect?: () => void;
	closeDateSelect?: () => void;
	onClickDateType?: (event: Event, option: unknown) => boolean;
	toggleReleaseType?: (type: string) => void;
	selectReleaseTypeAll?: () => void;
	selectReleaseTypeMain?: () => void;
	selectReleaseTypeAlbums?: () => void;
	selectReleaseTypeSingles?: () => void;
	selectReleaseTypeNone?: () => void;
	onMouseDownDateChooserDecade?: (event: Event, year: number) => void;
	onMouseUpDateChooserDecade?: (event: Event, year: number) => void;
	onMouseOverDateChooserDecade?: (event: Event, year: number) => void;
	onMouseDownDateChooserYear?: (event: Event, year: number) => void;
	onMouseUpDateChooserYear?: (event: Event, year: number) => void;
	onMouseOverDateChooserYear?: (event: Event, year: number) => void;
};

function injectGenreChartStyles(): void {
	if (document.getElementById("ebr-genre-chart-controls-style")) {
		return;
	}

	const style = document.createElement("style");
	style.id = "ebr-genre-chart-controls-style";
	style.textContent = `
	/* =========================================================
	 * Main controls row
	 * ======================================================= */

	.ebr-genre-chart-controls-row {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		flex: 0 0 auto;
		flex-wrap: nowrap;

		gap: .25em;
		width: auto;
		min-width: 0;
		margin-left: auto;

		position: relative;
	}

	.ebr-genre-chart-controls-row #page_chart_query {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		flex: 0 0 auto;
		flex-wrap: nowrap;

		gap: .25em;
		min-width: 0;
		margin-left: auto;

		position: static;
	}

	/*
	 * Keep these wrappers out of the absolute-positioning chain.
	 * All dropdowns are positioned against the complete controls row.
	 */
	.ebr-genre-chart-controls-row .page_chart_query_item_frame,
	.ebr-genre-chart-controls-row .page_chart_query_main_criteria {
		position: static;
		flex: 0 0 auto;
	}

	.ebr-genre-chart-controls-row .page_chart_query_item {
		height: 2.5em;
		box-sizing: border-box;

		align-items: center;
		margin-right: 0;

		white-space: nowrap;
	}

	.ebr-genre-chart-see-button {
		display: inline-flex !important;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;

		height: 2.5em;
		box-sizing: border-box;

		margin-left: .75em !important;

		white-space: nowrap;
	}


	/* =========================================================
	 * Dropdown positioning
	 *
	 * IMPORTANT:
	 * Every dropdown is anchored to the RIGHT edge of the
	 * complete controls row, which includes See Chart.
	 *
	 * Therefore the dropdown's right edge always lines up with
	 * the right edge of See Chart and wider menus grow leftward.
	 * ======================================================= */

	.ebr-genre-chart-controls-row .chart_ui_filter_list {
		position: absolute;

		left: auto !important;
		right: 0 !important;
		top: 3.2em;

		z-index: 7000;

		max-width: calc(100vw - 2em);

		line-height: 1;

		background: var(--surface-primary);
		border: 1px solid var(--ui-divider-line);
		box-shadow: 0 .25em .75em rgba(0, 0, 0, .18);
	}


	/* =========================================================
	 * Chart-type dropdown
	 * ======================================================= */

	.ebr-genre-chart-controls-row #page_chart_query_item_type_select {
		width: 30em;
		min-width: 30em;
	}


	/* =========================================================
	 * Common dropdown options
	 * ======================================================= */

	.ebr-genre-chart-controls-row .page_chart_query_item_option {
		background: var(--surface-primary);
		color: var(--text-primary);

		border-top: 1px solid var(--ui-divider-line);
	}

	.ebr-genre-chart-controls-row .page_chart_query_item_option:first-child {
		border-top: 0;
	}

	.ebr-genre-chart-controls-row .page_chart_query_item_option:hover {
		background: var(--surface-tertiary);
	}

	.ebr-genre-chart-controls-row .page_chart_query_item_option_description {
		color: var(--text-secondary);
	}


	/* =========================================================
	 * Release-type dropdown
	 *
	 * Native RYM dimensions:
	 * outer dropdown: 351px
	 * release section: 349px
	 * inner chooser: 330px
	 * normal cells: 82 × 28px
	 * ======================================================= */

	.ebr-genre-chart-controls-row #page_chart_query_item_chart_object_select {
		width: 351px;
		min-width: 351px;

		font-size: 14px;
		line-height: 14px;
	}

	.ebr-genre-chart-controls-row #chart_section_release_type {
		width: 349px;
		box-sizing: border-box;

		background: var(--surface-primary);
	}

	.ebr-genre-chart-controls-row
		.chart_section_release_type_chooser_frame {
		width: 349px;
		box-sizing: border-box;

		padding: 6px 10px 10px;

		background: var(--surface-primary);
	}


	/* Quick selectors: all | main | albums | singles | clear */

	.ebr-genre-chart-controls-row .chart_release_all_none {
		float: right;

		width: 248px;
		height: 21px;

		margin: 0 0 4px;

		font-size: 14px;
		line-height: 14px;
	}

	.ebr-genre-chart-controls-row .chart_release_all_none a {
		display: inline-block;

		height: 21px;
		padding: 0 4px;

		font-size: 14px;
		line-height: 21px;

		color: var(--text-secondary);

		cursor: pointer;
		user-select: none;
	}

	.ebr-genre-chart-controls-row .chart_release_all_none a:hover {
		color: var(--text-primary);
	}


	/* Main 4-column release grid */

	.ebr-genre-chart-controls-row
		#chart_section_release_type > .chart_section_release_type_chooser_frame > .release_type_chooser:not(.ebr-release-type-extra-row) {
		width: 330px;
		height: 58px;
		box-sizing: border-box;

		overflow: hidden;

		background: var(--surface-primary);

		border: 0;
		border-radius: 4px;
	}

	.ebr-genre-chart-controls-row
		#chart_section_release_type > .chart_section_release_type_chooser_frame > .release_type_chooser:not(.ebr-release-type-extra-row)
		.release_type_chooser_row {
		display: flex;

		width: 328px;
		height: 29px;

		overflow: hidden;
	}

	.ebr-genre-chart-controls-row
		#chart_section_release_type > .chart_section_release_type_chooser_frame > .release_type_chooser:not(.ebr-release-type-extra-row)
		.release_type_btn {
		display: flex;
		align-items: center;
		justify-content: center;

		flex: 0 0 82px;
		width: 82px !important;

		height: 28px;
		min-height: 28px;

		box-sizing: border-box;

		margin: 0;
		padding: 8px;

		font-size: 12px;
		font-weight: 400;
		line-height: 12px;
		text-align: center;
		white-space: nowrap;

		background: var(--surface-primary);
		color: var(--text-secondary);

		border: 0;
		border-right: 1px solid var(--ui-divider-line);
		border-radius: 0;

		cursor: pointer;
		user-select: none;
	}


	/* Supplemental row:
	 * Music video | Addl release | Songs
	 */

	.ebr-release-type-extra-row {
		width: 330px !important;
		height: 30px;

		box-sizing: border-box;

		margin-top: 6px;
		float: none !important;

		overflow: hidden;

		background: var(--surface-primary);

		border: 0;
		border-radius: 4px;
	}

	.ebr-release-type-extra-row .release_type_chooser_row {
		display: flex;

		width: 328px;
		height: 28px;

		overflow: hidden;
	}

	.ebr-release-type-extra-row .release_type_btn {
		display: flex;
		align-items: center;
		justify-content: center;

		flex: 1 1 0;
		width: auto !important;

		height: 28px;
		min-height: 28px;

		box-sizing: border-box;

		margin: 0;
		padding: 8px;

		font-size: 12px;
		font-weight: 400;
		line-height: 12px;
		text-align: center;
		white-space: nowrap;

		background: var(--surface-primary);
		color: var(--text-secondary);

		border: 0;
		border-right: 1px solid var(--ui-divider-line);
		border-radius: 0;

		cursor: pointer;
		user-select: none;
	}


	/* Release hover / selected states */

	.ebr-genre-chart-controls-row .release_type_btn:hover {
		background: var(--surface-secondary);
		color: var(--text-primary);
	}

	.ebr-genre-chart-controls-row .release_type_btn.selected {
		background: var(--btn-primary-background-default) !important;
		color: var(--btn-primary-text) !important;

		font-weight: 400;
	}


	/* Release chooser Close button */

	.ebr-genre-chart-controls-row
		.chart_section_release_type_chooser_frame_apply_btn {
		width: 330px;
		height: 26px;

		box-sizing: border-box;

		margin-top: 6px;

		text-align: right;
	}

	.ebr-genre-chart-controls-row
		.chart_section_release_type_chooser_frame_apply_btn .btn {
		display: inline-block;

		height: 26px;
		min-width: 19px;
		box-sizing: border-box;

		padding: 3px 10px;

		font-size: 13px;
		font-weight: 700;
		line-height: 18px;
	}


	/* =========================================================
	 * Date dropdown
	 *
	 * Native RYM:
	 * outer dropdown ≈ 351px
	 * option width ≈ 349px
	 * option height ≈ 61px
	 * ======================================================= */

	.ebr-genre-chart-controls-row #page_chart_query_item_date_select {
		width: 351px;
		min-width: 351px;

		font-size: 14px;
		line-height: 14px;
	}

	.ebr-genre-chart-controls-row
		#page_chart_query_item_date_select
		.page_chart_query_item_option {
		width: 349px;
		min-height: 61px;
		box-sizing: border-box;

		padding: 14px;

		font-size: 14px;
		line-height: 14px;
	}

	.ebr-genre-chart-controls-row
		#page_chart_query_item_date_select
		.page_chart_query_item_option_label {
		margin-left: 49px;

		font-size: 16px;
		line-height: 16px;
	}

	.ebr-genre-chart-controls-row
		#page_chart_query_item_date_select
		.page_chart_query_item_option_description {
		margin-top: 3px;
		margin-left: 49px;

		font-size: 12px;
		line-height: 12px;
	}


	/* =========================================================
	 * Date help
	 * ======================================================= */

	.ebr-chart-date-help {
		width: 349px;
		box-sizing: border-box;

		background: var(--surface-secondary);

		border-top: 1px solid var(--ui-divider-line);
		border-bottom: 1px solid var(--ui-divider-line);
	}

	.ebr-chart-date-help .help_bubble {
		display: none;

		margin: 0;
		padding: 1em;

		border-radius: 0;

		background: var(--surface-secondary);
		color: var(--text-secondary);
	}

	.ebr-chart-date-help .help_bubble p {
		margin: 0;

		line-height: 1.45;
	}

	.page_chart_query.date_type_all_time
		.ebr-chart-date-help-all-time,
	.page_chart_query.date_type_year_decade
		.ebr-chart-date-help-year-decade,
	.page_chart_query.date_type_year_range
		.ebr-chart-date-help-year-range {
		display: block;
	}

	.page_chart_query.date_type_all_time .date_year_chooser {
		display: none;
	}

	.page_chart_query.date_type_year_decade .date_year_chooser,
	.page_chart_query.date_type_year_range .date_year_chooser {
		display: block;
	}


	/* =========================================================
	 * Year / decade chooser
	 *
	 * Native dimensions:
	 * chooser: 349px
	 * row: 22px
	 * decade: ~69px
	 * normal year: ~28px
	 *
	 * Inline widths on 2020–2026 remain active so the incomplete
	 * decade fills the available width.
	 * ======================================================= */

	.ebr-genre-chart-controls-row .date_year_chooser {
		width: 349px;
		max-width: 349px;
		box-sizing: border-box;

		margin: 4px 0 14px;

		overflow: hidden;

		background: var(--mono-fc);

		border-left: 0;
		border-right: 0;
		border-radius: 4px;
		border-color: var(--ui-divider-line);

		font-size: 11px;
		line-height: 11px;
		white-space: nowrap;
	}

	.ebr-genre-chart-controls-row .date_year_chooser_row {
		display: flex;
		align-items: stretch;

		width: 100%;
		height: 22px;
		box-sizing: border-box;

		border-bottom: 1px solid var(--ui-divider-line);
	}

	.ebr-genre-chart-controls-row .date_year_chooser_row:last-child {
		border-bottom: 0;
	}

	.ebr-genre-chart-controls-row .date_year_chooser_decade_btn,
	.ebr-genre-chart-controls-row .date_year_chooser_year_btn {
		display: flex;
		align-items: center;
		justify-content: center;

		flex: 0 0 auto;

		height: 22px;
		min-height: 22px;
		box-sizing: border-box;

		margin: 0;
		padding: 5px 1px;

		font-size: 11px;
		line-height: 11px;
		text-align: center;
		white-space: nowrap;

		cursor: pointer;
		user-select: none;

		background: var(--mono-fc);
		color: var(--mono-a);

		border-right: 1px solid rgba(128, 128, 128, .2);
		border-radius: 0;
	}

	.ebr-genre-chart-controls-row .date_year_chooser_decade_btn {
		width: 20%;

		font-weight: bold;
	}

	/*
	 * NO !important here.
	 *
	 * Complete decades use 8%.
	 * The inline 11.43%/11.42% widths on 2020–2026 override this.
	 */
	.ebr-genre-chart-controls-row .date_year_chooser_year_btn {
		width: 8%;
	}

	.ebr-genre-chart-controls-row .date_year_chooser_decade_btn:hover,
	.ebr-genre-chart-controls-row .date_year_chooser_year_btn:hover {
		background: var(--surface-secondary);
		color: var(--text-primary);
	}

	.ebr-genre-chart-controls-row .date_year_chooser_decade_btn.selected,
	.ebr-genre-chart-controls-row .date_year_chooser_year_btn.selected {
		background: var(--btn-primary-background-default) !important;
		color: var(--btn-primary-text) !important;

		font-weight: bold;
	}

	.ebr-genre-chart-controls-row .date_year_chooser_toggle {
		background: var(--surface-secondary);

		border-top: 1px solid var(--ui-divider-line);

		color: var(--text-secondary);
	}

	.ebr-genre-chart-controls-row .page_chart_query_date_close {
		width: 349px;
		box-sizing: border-box;
		padding: .5em 1em 1em;
		text-align: center;
		background: var(--surface-primary);
	}


	/* =========================================================
	 * Selected radio-dot indicators
	 * ======================================================= */

	.ebr-genre-chart-controls-row
		.page_chart_query_item_option_icon
		.fa.fa-circle {
		display: none;
	}

	.ebr-genre-chart-controls-row
		.page_chart_query_item_option_icon
		.far.fa-circle {
		display: inline;
	}


	/* Chart type */

	.ebr-genre-chart-controls-row
		.page_chart_query.chart_type_top
		.page_chart_query_item_option_icon_chart_type_top
		.fa.fa-circle,
	.ebr-genre-chart-controls-row
		.page_chart_query.chart_type_popular
		.page_chart_query_item_option_icon_chart_type_popular
		.fa.fa-circle,
	.ebr-genre-chart-controls-row
		.page_chart_query.chart_type_esoteric
		.page_chart_query_item_option_icon_chart_type_esoteric
		.fa.fa-circle,
	.ebr-genre-chart-controls-row
		.page_chart_query.chart_type_diverse
		.page_chart_query_item_option_icon_chart_type_diverse
		.fa.fa-circle {
		display: inline;
	}

	.ebr-genre-chart-controls-row
		.page_chart_query.chart_type_top
		.page_chart_query_item_option_icon_chart_type_top
		.far.fa-circle,
	.ebr-genre-chart-controls-row
		.page_chart_query.chart_type_popular
		.page_chart_query_item_option_icon_chart_type_popular
		.far.fa-circle,
	.ebr-genre-chart-controls-row
		.page_chart_query.chart_type_esoteric
		.page_chart_query_item_option_icon_chart_type_esoteric
		.far.fa-circle,
	.ebr-genre-chart-controls-row
		.page_chart_query.chart_type_diverse
		.page_chart_query_item_option_icon_chart_type_diverse
		.far.fa-circle {
		display: none;
	}


	/* Music releases */

	.ebr-genre-chart-controls-row
		.page_chart_query.object_release
		.page_chart_query_item_option_icon_object_release
		.fa.fa-circle {
		display: inline;
	}

	.ebr-genre-chart-controls-row
		.page_chart_query.object_release
		.page_chart_query_item_option_icon_object_release
		.far.fa-circle {
		display: none;
	}


	/* Date mode */

	.ebr-genre-chart-controls-row
		.page_chart_query.date_type_all_time
		.page_chart_query_item_option_date_type_all_time
		.fa.fa-circle,
	.ebr-genre-chart-controls-row
		.page_chart_query.date_type_year_decade
		.page_chart_query_item_option_date_type_year_decade
		.fa.fa-circle,
	.ebr-genre-chart-controls-row
		.page_chart_query.date_type_year_range
		.page_chart_query_item_option_date_type_year_range
		.fa.fa-circle {
		display: inline;
	}

	.ebr-genre-chart-controls-row
		.page_chart_query.date_type_all_time
		.page_chart_query_item_option_date_type_all_time
		.far.fa-circle,
	.ebr-genre-chart-controls-row
		.page_chart_query.date_type_year_decade
		.page_chart_query_item_option_date_type_year_decade
		.far.fa-circle,
	.ebr-genre-chart-controls-row
		.page_chart_query.date_type_year_range
		.page_chart_query_item_option_date_type_year_range
		.far.fa-circle {
		display: none;
	}


	/* =========================================================
	 * Responsive
	 * ======================================================= */

	@media only screen and (max-width: 48.1em) {
		.ebr-genre-chart-controls-row {
			overflow-x: auto;

			scrollbar-width: none;
		}

		.ebr-genre-chart-controls-row::-webkit-scrollbar {
			display: none;
		}
	}
`;

	document.head.appendChild(style);
}

function ensureOverlay(): void {
	if (document.getElementById("overlay_invisible")) {
		return;
	}

	const overlay = document.createElement("div");
	overlay.id = "overlay_invisible";
	overlay.className = "overlay_invisible";
	document.body.appendChild(overlay);
}

function getRYMChart(): RYMChartLike | null {
	return (window as Window & { RYMchart?: RYMChartLike }).RYMchart ?? null;
}

function getOptionElement(option: unknown): HTMLElement | null {
	if (option instanceof HTMLElement) {
		return option;
	}

	const jqueryLike = option as { 0?: unknown } | null;
	return jqueryLike?.[0] instanceof HTMLElement ? jqueryLike[0] : null;
}

function hideChartMenus(): void {
	document
		.querySelectorAll<HTMLElement>(".chart_ui_filter_list")
		.forEach((menu) => {
			menu.style.display = "none";
		});
}

function showChartMenu(id: string, close: () => void): void {
	hideChartMenus();
	const overlay = document.getElementById("overlay_invisible");
	const menu = document.getElementById(id);
	if (!menu) {
		return;
	}

	menu.style.display = "block";
	if (overlay) {
		overlay.style.display = "block";
		overlay.onclick = close;
	}
}

function closeChartMenus(): void {
	hideChartMenus();
	const overlay = document.getElementById("overlay_invisible");
	if (overlay) {
		overlay.style.display = "none";
		overlay.onclick = null;
	}
}

function updateFrameClass(state: RYMChartState): void {
	const query = document.getElementById("page_chart_query");
	if (!query) {
		return;
	}

	for (const className of Array.from(query.classList)) {
		if (
			className.startsWith("chart_type_") ||
			className.startsWith("object_") ||
			className.startsWith("date_type_")
		) {
			query.classList.remove(className);
		}
	}

	query.classList.add(`chart_type_${state.chart_type ?? "top"}`);
	query.classList.add(`object_${state.chart_object ?? "release"}`);
	query.classList.add(`date_type_${state.chart_date_range_type ?? "all_time"}`);
}

function updateReleaseTypeValue(state: RYMChartState): void {
	const selected = getSelectedReleaseTypes();
	state.release_types = selected;

	const labels: Record<string, string> = {
		album: "Albums",
		ep: "EPs",
		comp: "Compilations",
		single: "Singles",
		video: "Videos",
		unauth: "Unauth/Bootlegs",
		song: "Songs",
		mixtape: "Mixtapes",
		musicvideo: "Music videos",
		djmix: "DJ mixes",
		additional: "Additional releases",
	};

	let title = "Releases";
	if (selected.length === 1) {
		title = labels[selected[0]] ?? "Releases";
	} else if (selected.length === 2) {
		title = `${labels[selected[0]]} and ${labels[selected[1]]}`;
	} else if (selected.length === 10 && !selected.includes("song")) {
		title = "Releases (all)";
	} else if (selected.length >= 3) {
		const firstThree = selected
			.slice(0, 3)
			.map((type) => labels[type] ?? type)
			.join(", ");

		const extraCount = selected.length - 3;

		title = extraCount > 0 ? `${firstThree} (+${extraCount})` : firstThree;
	}

	const objectTitle = document.getElementById(
		"page_chart_query_item_chart_object_title",
	);
	if (objectTitle) {
		objectTitle.textContent = title;
	}
}

function setSelectedReleaseTypes(types: string[], state: RYMChartState): void {
	document.querySelectorAll(".release_type_btn").forEach((button) => {
		button.classList.toggle(
			"selected",
			types.includes((button as HTMLElement).dataset.val ?? ""),
		);
	});
	state.chart_object =
		types.length === 1 && types[0] === "song" ? "song" : "release";
	updateFrameClass(state);
	updateReleaseTypeValue(state);
}

function selectDateRange(
	state: RYMChartState,
	startYear: number,
	endYear: number,
): void {
	state.start_date = startYear * 10000;
	state.end_date = endYear * 10000 + 9999;

	document
		.querySelectorAll(
			".date_year_chooser_decade_btn, .date_year_chooser_year_btn",
		)
		.forEach((button) => {
			button.classList.remove("selected");
		});

	for (let year = startYear; year <= endYear; year += 1) {
		document
			.getElementById(`date_year_chooser_year_${year}`)
			?.classList.add("selected");
	}

	if (startYear % 10 === 0 && endYear === startYear + 9) {
		document
			.getElementById(`date_year_chooser_decade_${startYear}`)
			?.classList.add("selected");
	}

	const title = document.getElementById(
		"page_chart_query_item_chart_date_type_title",
	);
	if (title) {
		title.textContent =
			startYear === endYear
				? String(startYear)
				: startYear % 10 === 0 && endYear === startYear + 9
					? `${startYear}s`
					: `${startYear} - ${endYear}`;
	}
}

function ensureRYMChartController(initialState: RYMChartState): RYMChartLike {
	const existing = getRYMChart();
	if (
		existing?.openChartTypeSelect &&
		existing?.openObjectTypeSelect &&
		existing?.openDateSelect
	) {
		return existing;
	}

	let rangeStartYear: number | null = null;
	const controller: RYMChartLike = {
		state: { ...initialState },
		_updateFrameClass: () => updateFrameClass(controller.state),
		_updateReleaseTypeValue: () => updateReleaseTypeValue(controller.state),
		openChartTypeSelect: () =>
			showChartMenu("page_chart_query_item_type_select", () =>
				controller.closeChartTypeSelect?.(),
			),
		closeChartTypeSelect: () => closeChartMenus(),
		onClickChartType: (_event, option) => {
			const element = getOptionElement(option);
			if (!element) return false;
			controller.state.chart_type = element.dataset.value ?? "top";
			const title = document.getElementById(
				"page_chart_query_item_chart_type_title",
			);
			if (title) title.textContent = element.dataset.description ?? "Top";
			controller._updateFrameClass?.();
			controller.closeChartTypeSelect?.();
			return false;
		},
		openObjectTypeSelect: () =>
			showChartMenu("page_chart_query_item_chart_object_select", () =>
				controller.closeObjectTypeSelect?.(),
			),
		closeObjectTypeSelect: () => closeChartMenus(),
		onClickObjectType: (_event, option) => {
			const element = getOptionElement(option);
			if (!element) return false;
			const value = element.dataset.value ?? "release";
			controller.state.chart_object = value;
			controller._updateFrameClass?.();
			if (value !== "release") {
				const title = document.getElementById(
					"page_chart_query_item_chart_object_title",
				);
				if (title) title.textContent = element.dataset.description ?? value;
				controller.closeObjectTypeSelect?.();
			} else {
				controller._updateReleaseTypeValue?.();
			}
			return false;
		},
		openDateSelect: () =>
			showChartMenu("page_chart_query_item_date_select", () =>
				controller.closeDateSelect?.(),
			),
		closeDateSelect: () => closeChartMenus(),
		onClickDateType: (_event, option) => {
			const element = getOptionElement(option);
			if (!element) return false;
			const value = element.dataset.value ?? "all_time";
			controller.state.chart_date_range_type = value;
			controller._updateFrameClass?.();
			rangeStartYear = null;
			if (value === "all_time") {
				controller.state.start_date = 18000000;
				controller.state.end_date = 20999999;
				const title = document.getElementById(
					"page_chart_query_item_chart_date_type_title",
				);
				if (title) title.textContent = "All-time";
				controller.closeDateSelect?.();
			}
			return false;
		},
		toggleReleaseType: (type) => {
			const button = document.getElementById(`release_type_btn_${type}`);
			if (!button) {
				return;
			}

			if (type === "song") {
				document
					.querySelectorAll(".release_type_btn.selected")
					.forEach((item) => {
						item.classList.remove("selected");
					});
				button.classList.add("selected");
				controller.state.chart_object = "song";
			} else {
				document
					.getElementById("release_type_btn_song")
					?.classList.remove("selected");
				button.classList.toggle("selected");
				controller.state.chart_object = "release";
			}

			controller._updateFrameClass?.();
			controller._updateReleaseTypeValue?.();
		},
		selectReleaseTypeAll: () =>
			setSelectedReleaseTypes(
				[
					"album",
					"ep",
					"mixtape",
					"djmix",
					"single",
					"comp",
					"video",
					"unauth",
					"musicvideo",
					"additional",
				],
				controller.state,
			),
		selectReleaseTypeMain: () =>
			setSelectedReleaseTypes(
				["album", "ep", "mixtape", "djmix"],
				controller.state,
			),
		selectReleaseTypeAlbums: () =>
			setSelectedReleaseTypes(["album"], controller.state),
		selectReleaseTypeSingles: () =>
			setSelectedReleaseTypes(["single"], controller.state),
		selectReleaseTypeNone: () => setSelectedReleaseTypes([], controller.state),
		onMouseDownDateChooserDecade: (_event, year) => {
			if (
				controller.state.chart_date_range_type === "year_range" &&
				rangeStartYear !== null
			) {
				const start = Math.min(rangeStartYear, year);
				const end = Math.max(rangeStartYear, year + 9);
				selectDateRange(controller.state, start, end);
				rangeStartYear = null;
			} else {
				selectDateRange(controller.state, year, year + 9);
				rangeStartYear =
					controller.state.chart_date_range_type === "year_range" ? year : null;
			}
		},
		onMouseUpDateChooserDecade: () => undefined,
		onMouseOverDateChooserDecade: () => undefined,
		onMouseDownDateChooserYear: (_event, year) => {
			if (
				controller.state.chart_date_range_type === "year_range" &&
				rangeStartYear !== null
			) {
				selectDateRange(
					controller.state,
					Math.min(rangeStartYear, year),
					Math.max(rangeStartYear, year),
				);
				rangeStartYear = null;
			} else {
				selectDateRange(controller.state, year, year);
				rangeStartYear =
					controller.state.chart_date_range_type === "year_range" ? year : null;
			}
		},
		onMouseUpDateChooserYear: () => undefined,
		onMouseOverDateChooserYear: () => undefined,
	};

	(window as Window & { RYMchart?: RYMChartLike }).RYMchart = controller;
	return controller;
}

function parseInitialChartState(
	seeChartButton: HTMLAnchorElement,
): RYMChartState {
	const href = seeChartButton.getAttribute("href") ?? "";
	const match = href.match(/^\/charts\/([^/]+)\/([^/]+)\/([^/]+)\//);

	const chartType = match?.[1] ?? "top";
	const objectType = match?.[2] ?? "album";
	const datePart = match?.[3] ?? "all-time";

	let startDate = 18000000;
	let endDate = 20999999;
	let dateRangeType = "all_time";

	if (/^\d{4}$/.test(datePart)) {
		const year = Number(datePart);
		startDate = year * 10000;
		endDate = year * 10000 + 9999;
		dateRangeType = "year_decade";
	} else if (/^\d{4}s$/.test(datePart)) {
		const year = Number(datePart.slice(0, 4));
		startDate = year * 10000;
		endDate = (year + 9) * 10000 + 9999;
		dateRangeType = "year_decade";
	}

	return {
		chart_type: chartType,
		chart_object: "release",
		chart_date_range_type: dateRangeType,
		release_types: [objectType],
		start_date: startDate,
		end_date: endDate,
	};
}

function initializeRYMChart(seeChartButton: HTMLAnchorElement): void {
	const rymChart = getRYMChart();
	if (!rymChart) {
		console.warn(
			"Even Better RYM: RYMchart is not available yet. Make sure the chart JS is loaded on genre pages.",
		);
		return;
	}

	const initialState = parseInitialChartState(seeChartButton);
	rymChart.state = {
		...rymChart.state,
		...initialState,
	};

	const releaseType = initialState.release_types?.[0] ?? "album";
	document
		.querySelectorAll(".release_type_btn")
		.forEach((button) => button.classList.remove("selected"));
	document
		.getElementById(`release_type_btn_${releaseType}`)
		?.classList.add("selected");

	const chartTypeTitle = document.getElementById(
		"page_chart_query_item_chart_type_title",
	);
	if (chartTypeTitle) {
		chartTypeTitle.textContent =
			(initialState.chart_type ?? "top").charAt(0).toUpperCase() +
			(initialState.chart_type ?? "top").slice(1);
	}

	rymChart._updateReleaseTypeValue?.();
	rymChart._updateFrameClass?.();
}

function getSelectedReleaseTypes(): string[] {
	return Array.from(
		document.querySelectorAll<HTMLElement>(
			".release_type_btn.selected[data-val]",
		),
	)
		.map((element) => element.dataset.val)
		.filter((value): value is string => Boolean(value));
}

function getCurrentReleaseType(seeChartButton: HTMLAnchorElement): string {
	const selected = getSelectedReleaseTypes();
	if (selected.length === 1) {
		return selected[0];
	}

	const match = seeChartButton
		.getAttribute("href")
		?.match(/^\/charts\/[^/]+\/([^/]+)\//);
	return match?.[1] ?? "album";
}

function getDatePath(state: RYMChartState): string {
	const start = state.start_date ?? 18000000;
	const end = state.end_date ?? 20999999;

	if (start <= 18000000 && end >= 20999999) {
		return "all-time";
	}

	const startYear = Math.floor(start / 10000);
	const endYear = Math.floor(end / 10000);

	if (startYear === endYear) {
		return String(startYear);
	}

	if (startYear % 10 === 0 && endYear === startYear + 9) {
		return `${startYear}s`;
	}

	return `${startYear}-${endYear}`;
}

function updateSeeChartButton(seeChartButton: HTMLAnchorElement): void {
	const rymChart = getRYMChart();
	const state = rymChart?.state ?? parseInitialChartState(seeChartButton);
	const selectedReleaseTypes = getSelectedReleaseTypes();

	const originalHref =
		seeChartButton.dataset.ebrOriginalChartHref ??
		seeChartButton.getAttribute("href") ??
		"";
	seeChartButton.dataset.ebrOriginalChartHref = originalHref;

	const suffixMatch = originalHref.match(
		/^\/charts\/[^/]+\/[^/]+\/[^/]+\/(.*)$/,
	);
	const suffix = suffixMatch?.[1] ?? "";
	const chartType = state.chart_type ?? "top";
	const datePath = getDatePath(state);

	const allReleaseTypes = [
		"album",
		"ep",
		"mixtape",
		"djmix",
		"single",
		"comp",
		"video",
		"unauth",
		"musicvideo",
		"additional",
	];

	let mediaType = "album";
	let buttonLabel = "Album";

	if (selectedReleaseTypes.length === 1 && selectedReleaseTypes[0] === "song") {
		mediaType = "song";
		buttonLabel = "Song";
	} else {
		const releaseTypes = selectedReleaseTypes.filter((type) => type !== "song");

		const allReleasesSelected =
			releaseTypes.length === allReleaseTypes.length &&
			allReleaseTypes.every((type) => releaseTypes.includes(type));

		if (allReleasesSelected) {
			mediaType = "release";
			buttonLabel = "Releases";
		} else if (releaseTypes.length === 1) {
			mediaType = releaseTypes[0];
			buttonLabel = RELEASE_TYPE_LABELS[releaseTypes[0]] ?? "Release";
		} else if (releaseTypes.length > 1) {
			mediaType = releaseTypes.join(",");

			const labels = releaseTypes.map(
				(type) => RELEASE_TYPE_LABELS[type] ?? type,
			);

			buttonLabel =
				labels.length === 2
					? `${labels[0]} and ${labels[1]}`
					: labels.join(", ");
		} else {
			mediaType = "album";
			buttonLabel = "Album";
		}
	}

	const releaseTypeTitle = document
		.getElementById("page_chart_query_item_chart_object_title")
		?.textContent?.trim();

	const compactLabel =
		releaseTypeTitle && releaseTypeTitle.length > 0
			? releaseTypeTitle
			: buttonLabel;

	seeChartButton.textContent = `See ${compactLabel} chart`;
	seeChartButton.href = `/charts/${chartType}/${mediaType}/${datePath}/${suffix}`;
}

function watchChartState(seeChartButton: HTMLAnchorElement): void {
	const query = document.getElementById("page_chart_query");
	if (!query) {
		return;
	}

	const sync = () => {
		requestAnimationFrame(() => updateSeeChartButton(seeChartButton));
	};

	query.addEventListener("click", sync);
	query.addEventListener("mousedown", sync);

	const observer = new MutationObserver(sync);
	observer.observe(query, {
		subtree: true,
		attributes: true,
		attributeFilter: ["class"],
		characterData: true,
	});
}

function wireGenreChartControls(seeChartButton: HTMLAnchorElement): void {
	const query = document.getElementById("page_chart_query");
	if (!query) {
		return;
	}

	query
		.querySelectorAll<HTMLElement>(
			"[onclick], [onmousedown], [onmouseup], [onmouseover]",
		)
		.forEach((element) => {
			element.removeAttribute("onclick");
			element.removeAttribute("onmousedown");
			element.removeAttribute("onmouseup");
			element.removeAttribute("onmouseover");
		});

	const topButton = document
		.getElementById("page_chart_query_item_chart_type_title")
		?.closest<HTMLElement>(".page_chart_query_item_type_selector");
	const objectButton = document
		.getElementById("page_chart_query_item_chart_object_title")
		?.closest<HTMLElement>(".page_chart_query_item_type_selector");
	const dateButton = document
		.getElementById("page_chart_query_item_chart_date_type_title")
		?.closest<HTMLElement>(".page_chart_query_item_type_selector");

	const topMenu = document.getElementById("page_chart_query_item_type_select");
	const objectMenu = document.getElementById(
		"page_chart_query_item_chart_object_select",
	);
	const dateMenu = document.getElementById("page_chart_query_item_date_select");

	const closeAllMenus = () => {
		[topMenu, objectMenu, dateMenu].forEach((menu) => {
			if (menu) menu.style.display = "none";
		});
		const overlay = document.getElementById("overlay_invisible");
		if (overlay) overlay.style.display = "none";
	};

	const toggleMenu = (menu: HTMLElement | null) => {
		if (!menu) return;
		const isOpen = getComputedStyle(menu).display !== "none";
		closeAllMenus();
		if (!isOpen) {
			menu.style.display = "block";
			const overlay = document.getElementById("overlay_invisible");
			if (overlay) overlay.style.display = "block";
		}
	};

	topButton?.addEventListener("click", (event) => {
		event.preventDefault();
		event.stopPropagation();
		toggleMenu(topMenu);
	});
	objectButton?.addEventListener("click", (event) => {
		event.preventDefault();
		event.stopPropagation();
		toggleMenu(objectMenu);
	});
	dateButton?.addEventListener("click", (event) => {
		event.preventDefault();
		event.stopPropagation();
		toggleMenu(dateMenu);
	});

	topMenu
		?.querySelectorAll<HTMLElement>(".page_chart_query_item_option[data-value]")
		.forEach((option) => {
			option.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				const chart = getRYMChart();
				if (!chart) return;
				chart.state.chart_type = option.dataset.value ?? "top";
				const title = document.getElementById(
					"page_chart_query_item_chart_type_title",
				);
				if (title) title.textContent = option.dataset.description ?? "Top";
				chart._updateFrameClass?.();
				closeAllMenus();
				updateSeeChartButton(seeChartButton);
			});
		});

	query
		.querySelectorAll<HTMLElement>(".release_type_btn[data-val]")
		.forEach((button) => {
			button.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				const type = button.dataset.val;
				if (!type) return;
				getRYMChart()?.toggleReleaseType?.(type);
				updateSeeChartButton(seeChartButton);
			});
		});

	const releaseActions: Array<[string, keyof RYMChartLike]> = [
		["chart_release_all_none_btn_all", "selectReleaseTypeAll"],
		["chart_release_all_none_btn_main", "selectReleaseTypeMain"],
		["chart_release_all_none_btn_albums", "selectReleaseTypeAlbums"],
		["chart_release_all_none_btn_singles", "selectReleaseTypeSingles"],
		["chart_release_all_none_btn_clear", "selectReleaseTypeNone"],
	];
	for (const [id, method] of releaseActions) {
		document.getElementById(id)?.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			const chart = getRYMChart();
			const fn = chart?.[method];
			if (typeof fn === "function") {
				(fn as () => void)();
			}
			updateSeeChartButton(seeChartButton);
		});
	}

	objectMenu
		?.querySelector<HTMLElement>(
			".chart_section_release_type_chooser_frame_apply_btn .btn",
		)
		?.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			closeAllMenus();
		});

	dateMenu
		?.querySelectorAll<HTMLElement>(".page_chart_query_item_option[data-value]")
		.forEach((option) => {
			option.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				const chart = getRYMChart();
				if (!chart) return;
				const value = option.dataset.value ?? "all_time";
				chart.state.chart_date_range_type = value;
				if (value === "all_time") {
					chart.state.start_date = 18000000;
					chart.state.end_date = 20999999;
					const title = document.getElementById(
						"page_chart_query_item_chart_date_type_title",
					);
					if (title) title.textContent = "All-time";
				}
				chart._updateFrameClass?.();
				if (value === "all_time") closeAllMenus();
				updateSeeChartButton(seeChartButton);
			});
		});

	query
		.querySelectorAll<HTMLElement>(".date_year_chooser_year_btn")
		.forEach((button) => {
			const match = button.id.match(/date_year_chooser_year_(\d{4})$/);
			if (!match) return;
			const year = Number(match[1]);
			button.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				getRYMChart()?.onMouseDownDateChooserYear?.(event, year);
				updateSeeChartButton(seeChartButton);
			});
		});

	query
		.querySelectorAll<HTMLElement>(".date_year_chooser_decade_btn")
		.forEach((button) => {
			const match = button.id.match(/date_year_chooser_decade_(\d{4})$/);
			if (!match) return;
			const year = Number(match[1]);
			button.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				getRYMChart()?.onMouseDownDateChooserDecade?.(event, year);
				updateSeeChartButton(seeChartButton);
			});
		});

	const extraYears = document.getElementById("date_year_chooser_extra");
	const yearToggle = query.querySelector<HTMLElement>(
		".date_year_chooser_toggle",
	);
	yearToggle?.addEventListener("click", (event) => {
		event.preventDefault();
		event.stopPropagation();
		if (!extraYears) return;
		const opening = getComputedStyle(extraYears).display === "none";
		extraYears.style.display = opening ? "block" : "none";
		const icon = document.getElementById("date_year_toggle_icon");
		icon?.classList.toggle("fa-caret-down", !opening);
		icon?.classList.toggle("fa-caret-up", opening);
	});

	dateMenu
		?.querySelector<HTMLElement>(".page_chart_query_date_close .btn")
		?.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			closeAllMenus();
		});

	document
		.getElementById("overlay_invisible")
		?.addEventListener("click", closeAllMenus);
}

export async function main(): Promise<void> {
	console.log("Even Better RYM: Genre pages script loaded");
	await waitForDocumentReady();

	const seeChartButton = document.querySelector<HTMLAnchorElement>(
		'.page_section_charts_header a[href*="/charts/"]',
	);
	if (!seeChartButton) {
		console.warn("Even Better RYM: See chart button not found");
		return;
	}

	const header = seeChartButton.closest<HTMLElement>(
		".page_section_charts_header",
	);
	if (!header) {
		return;
	}

	if (document.querySelector(".ebr-genre-chart-controls-row")) {
		return;
	}

	injectGenreChartStyles();
	ensureOverlay();

	const originalButtonParent = seeChartButton.parentElement;

	const controlsRow = document.createElement("div");
	controlsRow.className = "ebr-genre-chart-controls-row";

	/*
	 * Put the filter controls and See Chart button into one stable
	 * right-aligned group inside the existing chart header.
	 */
	if (originalButtonParent) {
		originalButtonParent.insertAdjacentElement("beforebegin", controlsRow);
	} else {
		header.appendChild(controlsRow);
	}

	controlsRow.insertAdjacentHTML("beforeend", CHART_CONTROLS_HTML);

	seeChartButton.classList.add("ebr-genre-chart-see-button");
	controlsRow.appendChild(seeChartButton);

	if (
		originalButtonParent &&
		originalButtonParent !== controlsRow &&
		originalButtonParent.children.length === 0
	) {
		originalButtonParent.remove();
	}

	// The source chart script declares RYMchart as a page-global classic-script
	// variable. If an extracted copy is bundled as a module, that variable is not
	// automatically exposed on window, so the inline onclick handlers cannot see
	// it. Install a small compatible controller when no usable global exists.
	ensureRYMChartController(parseInitialChartState(seeChartButton));
	initializeRYMChart(seeChartButton);
	wireGenreChartControls(seeChartButton);
	updateSeeChartButton(seeChartButton);
	watchChartState(seeChartButton);
}
