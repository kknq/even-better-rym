export const CHART_CONTROLS_HTML = `
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
        <div class="date_year_chooser" id="date_year_chooser"></div>
        <div class="page_chart_query_date_close">
          <a class="btn blue_btn" onclick="RYMchart.closeDateSelect()">Close</a>
        </div>
      </div>
    </div>
  </div>
</div>
`;
